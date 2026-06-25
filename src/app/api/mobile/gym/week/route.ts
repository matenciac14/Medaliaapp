import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { getWeekBounds, buildDaySummaries } from '@/domain/gym/build-gym-week'
import { requireFeature } from '@/lib/guards/feature-gate'
import { rateLimitAsync } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:gym-week`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'gym')
  if (featureGuard) return featureGuard

  const athleteId = mobile.id
  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0') || 0
  const selectedDow = parseInt(req.nextUrl.searchParams.get('selectedDow') ?? '0') || 0

  const assigned = await prisma.assignedWorkout.findFirst({
    where: { athleteId, isActive: true },
    include: {
      template: {
        include: {
          days: {
            include: {
              exercises: { include: { exercise: { select: { name: true, muscleGroups: true } } }, orderBy: { order: 'asc' } },
            },
          },
        },
      },
      coach: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!assigned) return NextResponse.json({ error: 'Sin rutina asignada' }, { status: 404 })

  const { monday, sunday } = getWeekBounds(weekOffset)
  const isCurrentWeek = weekOffset === 0

  // Find active running plan to compute current weekNumber (same logic as calendar)
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId: athleteId, status: 'ACTIVE' },
    select: { id: true, startDate: true },
  })

  const targetWeekNumber = activePlan
    ? Math.floor((monday.getTime() - new Date(activePlan.startDate).getTime()) / 86_400_000 / 7) + 1
    : null

  const [weekSessions, weekRunningSessions] = await Promise.all([
    prisma.gymSession.findMany({
      where: { athleteId, assignedWorkoutId: assigned.id, date: { gte: monday, lte: sunday } },
      select: { dayOfWeek: true, completed: true, id: true },
    }),
    activePlan && targetWeekNumber !== null && targetWeekNumber >= 1
      ? prisma.plannedSession.findMany({
          where: {
            week: { planId: activePlan.id, weekNumber: targetWeekNumber },
            NOT: { type: 'DESCANSO' },
          },
          select: { dayOfWeek: true, type: true, durationMin: true, zoneTarget: true, intensity: true },
        })
      : Promise.resolve([]),
  ])

  // Map dayOfWeek → running session for this week
  const runningByDow: Record<number, { type: string; durationMin: number | null; zoneTarget: string | null; intensity: string }> = {}
  for (const s of weekRunningSessions) {
    runningByDow[s.dayOfWeek] = { type: s.type, durationMin: s.durationMin, zoneTarget: s.zoneTarget, intensity: s.intensity }
  }

  const completedDows = new Set(weekSessions.filter(s => s.completed).map(s => s.dayOfWeek))
  const days = buildDaySummaries(monday, assigned.template.days, completedDows, isCurrentWeek).map(day => ({
    ...day,
    runningSession: runningByDow[day.dow] ?? null,
  }))

  // Detail for selectedDow
  let selectedDetail: {
    type: 'completed' | 'planned' | 'rest' | 'none'
    session?: { durationMin: number | null; rpe: number | null; notes: string | null; exercises: { name: string; sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[] }[] }
    planned?: { label: string; exercises: { name: string; sets: number; repsScheme: string }[] }
  } | null = null

  if (selectedDow >= 1 && selectedDow <= 7) {
    const workoutDay = assigned.template.days.find(d => d.dayOfWeek === selectedDow)
    if (workoutDay?.isRestDay ?? !workoutDay) {
      selectedDetail = { type: 'rest' }
    } else {
      const selDayStart = new Date(monday)
      selDayStart.setDate(monday.getDate() + (selectedDow - 1))
      selDayStart.setHours(0, 0, 0, 0)
      const selDayEnd = new Date(selDayStart)
      selDayEnd.setDate(selDayStart.getDate() + 1)

      const session = await prisma.gymSession.findFirst({
        where: { athleteId, assignedWorkoutId: assigned.id, dayOfWeek: selectedDow, date: { gte: selDayStart, lt: selDayEnd } },
        include: {
          setLogs: {
            include: { workoutExercise: { include: { exercise: { select: { name: true } } } } },
            orderBy: [{ workoutExerciseId: 'asc' }, { setNumber: 'asc' }],
          },
        },
      })

      if (session?.completed && session.setLogs.length > 0) {
        const exerciseMap = new Map<string, { name: string; sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[] }>()
        for (const sl of session.setLogs) {
          const key = sl.workoutExercise?.id ?? sl.exerciseName ?? 'unknown'
          if (!exerciseMap.has(key)) exerciseMap.set(key, { name: sl.workoutExercise?.exercise.name ?? sl.exerciseName ?? 'Ejercicio', sets: [] })
          exerciseMap.get(key)!.sets.push({ setNumber: sl.setNumber, weightKg: sl.weightKg, repsCompleted: sl.repsCompleted, completed: sl.completed })
        }
        selectedDetail = { type: 'completed', session: { durationMin: session.durationMin, rpe: session.rpe, notes: session.notes, exercises: [...exerciseMap.values()] } }
      } else if (workoutDay && !workoutDay.isRestDay) {
        selectedDetail = { type: 'planned', planned: { label: workoutDay.label, exercises: workoutDay.exercises.map(ex => ({ name: ex.exercise.name, sets: ex.sets, repsScheme: ex.repsScheme })) } }
      } else {
        selectedDetail = { type: 'none' }
      }
    }
  }

  return NextResponse.json({
    templateName: assigned.template.name,
    coachName: assigned.coach?.name ?? null,
    weekOffset,
    isCurrentWeek,
    mondayDate: monday.toISOString(),
    completedCount: completedDows.size,
    trainingDays: assigned.template.days.filter(d => !d.isRestDay).length,
    days,
    selectedDetail,
  })
}
