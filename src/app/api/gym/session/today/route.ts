import { NextRequest, NextResponse } from 'next/server'
import { jsToOurDow } from '@/lib/core/date-utils'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'


export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Feature gate
  const userRecord = await prisma.user.findUnique({ where: { id: athleteId }, select: { featureGym: true, timezone: true } })
  if (!userRecord?.featureGym) {
    return NextResponse.json({ error: 'La función de Ejercicios está disponible en el plan Pro.' }, { status: 403 })
  }

  const tz = userRecord.timezone ?? 'America/Bogota'
  const todayDow = jsToOurDow(new Date(new Date().toLocaleString('en-US', { timeZone: tz })).getDay())

  // Parallel: fetch active plan + assigned workout + coach relation + self-coach routine
  const [activePlan, assigned, coachRelation, plannedRunTodayRaw, weeklyRoutine] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      select: { id: true, startDate: true },
    }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId, isActive: true },
      include: {
        template: {
          include: {
            days: {
              where: { dayOfWeek: todayDow },
              include: {
                exercises: {
                  orderBy: { order: 'asc' },
                  include: { exercise: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId, status: 'ACTIVE' },
      select: { coachId: true },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        weeks: {
          select: {
            sessions: {
              where: { dayOfWeek: todayDow, type: { notIn: ['FUERZA', 'DESCANSO'] } },
              select: { type: true, durationMin: true, zoneTarget: true, intensity: true },
              take: 1,
            },
          },
        },
      },
    }),
    // GYM-GAP-06: self-coach B2C routine — used in free session fallback
    prisma.weeklyRoutine.findUnique({ where: { userId: athleteId }, select: { days: true, daysPerWeek: true } }),
  ])

  const plannedRunToday = plannedRunTodayRaw?.weeks
    .flatMap(w => w.sessions)
    .find(Boolean) ?? null

  const hasCoach = !!coachRelation
  const todayDay = assigned?.template?.days[0] ?? null

  // ─── AssignedWorkout path ───────────────────────────────────────────────────
  if (assigned && todayDay) {
    if (todayDay.isRestDay) {
      return NextResponse.json({
        assignedWorkoutId: assigned.id,
        plannedSessionId: null,
        templateName: assigned.template.name,
        dayOfWeek: todayDow,
        isRestDay: true,
        hasCoach,
        workoutDay: todayDay,
        exercises: [],
        previousLogs: [],
        plannedSession: null,
      plannedRunToday: plannedRunToday ? { type: plannedRunToday.type, durationMin: plannedRunToday.durationMin, zoneTarget: plannedRunToday.zoneTarget ?? null } : null,
      })
    }

    const previousSession = await prisma.gymSession.findFirst({
      where: { athleteId, assignedWorkoutId: assigned.id, dayOfWeek: todayDow, completed: true },
      orderBy: { date: 'desc' },
      include: { setLogs: true },
    })

    return NextResponse.json({
      assignedWorkoutId: assigned.id,
      plannedSessionId: null,
      templateName: assigned.template.name,
      dayOfWeek: todayDow,
      isRestDay: false,
      hasCoach,
      workoutDay: {
        id: todayDay.id,
        label: todayDay.label,
        muscleGroups: todayDay.muscleGroups,
        warmupNotes: todayDay.warmupNotes,
        cardioNotes: todayDay.cardioNotes,
      },
      exercises: todayDay.exercises.map((we) => ({
        id: we.id,
        order: we.order,
        sets: we.sets,
        repsScheme: we.repsScheme,
        restSeconds: we.restSeconds,
        notes: we.notes,
        setType: we.setType,
        supersetWith: we.supersetWith,
        suggestedNextWeightKg: we.suggestedNextWeightKg ?? null,
        exercise: {
          id: we.exercise.id,
          name: we.exercise.nameEs ?? we.exercise.name,
          bodyPart: we.exercise.bodyPart,
          target: we.exercise.target,
          equipment: we.exercise.equipment,
          mechanic: we.exercise.mechanic,
          description: we.exercise.description,
          gif: we.exercise.gifStoredUrl ?? we.exercise.gifUrl ?? null,
        },
        previousLogs: (previousSession?.setLogs ?? [])
          .filter(sl => sl.workoutExerciseId === we.id)
          .map(sl => ({
            setNumber: sl.setNumber,
            weightKg: sl.weightKg,
            repsCompleted: sl.repsCompleted,
            completed: sl.completed,
          })),
      })),
      previousLogs: previousSession?.setLogs ?? [],
      plannedSession: null,
      plannedRunToday: plannedRunToday ? { type: plannedRunToday.type, durationMin: plannedRunToday.durationMin, zoneTarget: plannedRunToday.zoneTarget ?? null } : null,
    })
  }

  // ─── Plan-based fallback (FUERZA session with workoutDayId) ────────────────
  if (activePlan) {
    const planStart = new Date(activePlan.startDate)
    planStart.setHours(0, 0, 0, 0)
    const todayLocalStr = new Date().toLocaleString('en-US', { timeZone: tz })
    const todayDate = new Date(todayLocalStr)
    todayDate.setHours(0, 0, 0, 0)
    const targetWeekNumber = Math.floor((todayDate.getTime() - planStart.getTime()) / 86_400_000 / 7) + 1

    if (targetWeekNumber >= 1) {
      const fuerzaSession = await prisma.plannedSession.findFirst({
        where: {
          week: { planId: activePlan.id, weekNumber: targetWeekNumber },
          dayOfWeek: todayDow,
          type: 'FUERZA',
          workoutDayId: { not: null },
        },
        include: {
          workoutDay: {
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: { exercise: true },
              },
            },
          },
        },
      })

      if (fuerzaSession?.workoutDay) {
        const { workoutDay } = fuerzaSession

        // Previous logs: find most recent GymSession with same workoutDayId
        const previousSession = await prisma.gymSession.findFirst({
          where: {
            athleteId,
            plannedSession: { workoutDayId: fuerzaSession.workoutDayId },
            completed: true,
            NOT: { plannedSessionId: fuerzaSession.id },
          },
          orderBy: { date: 'desc' },
          include: { setLogs: true },
        })

        return NextResponse.json({
          assignedWorkoutId: null,
          plannedSessionId: fuerzaSession.id,
          templateName: workoutDay.label,
          dayOfWeek: todayDow,
          isRestDay: false,
          hasCoach,
          workoutDay: {
            id: workoutDay.id,
            label: workoutDay.label,
            muscleGroups: workoutDay.muscleGroups,
            warmupNotes: workoutDay.warmupNotes ?? null,
            cardioNotes: workoutDay.cardioNotes ?? null,
          },
          exercises: workoutDay.exercises.map((we) => ({
            id: we.id,
            order: we.order,
            sets: we.sets,
            repsScheme: we.repsScheme,
            restSeconds: we.restSeconds,
            notes: we.notes,
            setType: we.setType,
            supersetWith: we.supersetWith,
            suggestedNextWeightKg: we.suggestedNextWeightKg ?? null,
            exercise: {
              id: we.exercise.id,
              name: we.exercise.nameEs ?? we.exercise.name,
              bodyPart: we.exercise.bodyPart,
              target: we.exercise.target,
              equipment: we.exercise.equipment,
              mechanic: we.exercise.mechanic,
              description: we.exercise.description,
              gif: we.exercise.gifStoredUrl ?? we.exercise.gifUrl ?? null,
            },
            previousLogs: (previousSession?.setLogs ?? [])
              .filter(sl => sl.workoutExerciseId === we.id)
              .map(sl => ({
                setNumber: sl.setNumber,
                weightKg: sl.weightKg,
                repsCompleted: sl.repsCompleted,
                completed: sl.completed,
              })),
          })),
          previousLogs: previousSession?.setLogs ?? [],
          plannedSession: null,
      plannedRunToday: plannedRunToday ? { type: plannedRunToday.type, durationMin: plannedRunToday.durationMin, zoneTarget: plannedRunToday.zoneTarget ?? null } : null,
        })
      }
    }
  }

  // ─── Free session fallback ─────────────────────────────────────────────────
  // GYM-GAP-06: include self-coach WeeklyRoutine context so mobile can show planned day info
  type RoutineDay = { dow: number; activity: string; split?: string | null; runType?: string | null }
  const days = (weeklyRoutine?.days ?? []) as RoutineDay[]
  const selfCoachDay = days.find(d => d.dow === todayDow) ?? null

  return NextResponse.json({
    assignedWorkoutId: null,
    plannedSessionId: null,
    templateName: selfCoachDay?.activity === 'GYM'
      ? (selfCoachDay.split ?? 'Sesión libre')
      : 'Sesión libre',
    dayOfWeek: todayDow,
    isRestDay: selfCoachDay?.activity === 'REST',
    freeSession: true,
    selfCoachDay,
    hasCoach,
    workoutDay: null,
    exercises: [],
    previousLogs: [],
    plannedSession: null,
  })
}
