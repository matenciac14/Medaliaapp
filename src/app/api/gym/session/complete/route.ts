import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { autoCompleteStrengthSession } from '@/domain/gym/auto-complete-strength'
import { parseUserConfig } from '@/lib/config/user-config'

type SetPayload = {
  workoutExerciseId: string
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
  completed: boolean
}

type ExerciseOverride = {
  originalWorkoutExerciseId: string
  replacedWithExerciseId: string
  replacedExerciseName: string
  reason?: string
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Feature gate
  const userRecord = await prisma.user.findUnique({ where: { id: athleteId }, select: { config: true } })
  if (!parseUserConfig(userRecord?.config).features.gym) {
    return NextResponse.json({ error: 'La función de Gym está disponible en el plan Pro.' }, { status: 403 })
  }

  let body: {
    assignedWorkoutId?: string
    plannedSessionId?: string
    dayOfWeek: number
    rpe?: number
    durationMin?: number
    notes?: string
    sets?: SetPayload[]
    exerciseOverrides?: ExerciseOverride[]
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { dayOfWeek, rpe, durationMin, notes } = body
  const sets = body.sets ?? []
  const exerciseOverrides = body.exerciseOverrides ?? null

  if (!dayOfWeek || !Array.isArray(sets))
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  // Pre-fetch exercise names for denormalization
  const weIds = [...new Set(sets.map(s => s.workoutExerciseId).filter(Boolean))]
  const workoutExercises = weIds.length > 0
    ? await prisma.workoutExercise.findMany({
        where: { id: { in: weIds } },
        select: { id: true, exercise: { select: { name: true } } },
      })
    : []
  const weNameMap = new Map(workoutExercises.map(we => [we.id, we.exercise.name]))

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // ─── Plan-based path ────────────────────────────────────────────────────────
  if (body.plannedSessionId) {
    const fuerzaSession = await prisma.plannedSession.findFirst({
      where: {
        id: body.plannedSessionId,
        week: { plan: { userId: athleteId, status: 'ACTIVE' } },
        type: 'FUERZA',
      },
      select: { id: true },
    })
    if (!fuerzaSession) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

    const gymSession = await prisma.gymSession.create({
      data: {
        athleteId,
        plannedSessionId: fuerzaSession.id,
        assignedWorkoutId: null,
        dayOfWeek,
        date: today,
        durationMin: durationMin ?? null,
        rpe: rpe ?? null,
        notes: notes ?? null,
        completed: true,
        exerciseOverrides: exerciseOverrides ? exerciseOverrides : undefined,
        setLogs: {
          create: sets.map(s => ({
            workoutExerciseId: s.workoutExerciseId,
            exerciseName: weNameMap.get(s.workoutExerciseId) ?? null,
            setNumber: s.setNumber,
            weightKg: s.weightKg ?? null,
            repsCompleted: s.repsCompleted ?? null,
            completed: s.completed,
          })),
        },
      },
      select: { id: true },
    })

    autoCompleteStrengthSession({ athleteId, rpe, durationMin, notes }).catch(() => {})
    return NextResponse.json({ sessionId: gymSession.id }, { status: 201 })
  }

  // ─── AssignedWorkout path ────────────────────────────────────────────────────
  if (!body.assignedWorkoutId)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  const assigned = await prisma.assignedWorkout.findFirst({
    where: { id: body.assignedWorkoutId, athleteId, isActive: true },
  })
  if (!assigned) return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })

  const gymSession = await prisma.gymSession.create({
    data: {
      athleteId,
      assignedWorkoutId: body.assignedWorkoutId,
      plannedSessionId: null,
      dayOfWeek,
      date: today,
      durationMin: durationMin ?? null,
      rpe: rpe ?? null,
      notes: notes ?? null,
      completed: true,
      exerciseOverrides: exerciseOverrides ? exerciseOverrides : undefined,
      setLogs: {
        create: sets.map(s => ({
          workoutExerciseId: s.workoutExerciseId,
          exerciseName: weNameMap.get(s.workoutExerciseId) ?? null,
          setNumber: s.setNumber,
          weightKg: s.weightKg ?? null,
          repsCompleted: s.repsCompleted ?? null,
          completed: s.completed,
        })),
      },
    },
    select: { id: true },
  })

  autoCompleteStrengthSession({ athleteId, rpe, durationMin, notes }).catch(() => {})

  return NextResponse.json({ sessionId: gymSession.id }, { status: 201 })
}
