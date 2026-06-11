import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

type SetPayload = {
  workoutExerciseId: string
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
  completed: boolean
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: {
    assignedWorkoutId: string
    dayOfWeek: number
    rpe?: number
    durationMin?: number
    notes?: string
    sets?: SetPayload[]
    setLogs?: SetPayload[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { assignedWorkoutId, dayOfWeek, rpe, durationMin, notes } = body
  const sets = body.sets ?? body.setLogs ?? []

  if (!assignedWorkoutId || !dayOfWeek || !Array.isArray(sets)) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Verify the assignment belongs to this athlete
  const assigned = await prisma.assignedWorkout.findFirst({
    where: { id: assignedWorkoutId, athleteId, isActive: true },
  })

  if (!assigned) {
    return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const gymSession = await prisma.gymSession.create({
    data: {
      athleteId,
      assignedWorkoutId,
      dayOfWeek,
      date: today,
      durationMin: durationMin ?? null,
      rpe: rpe ?? null,
      notes: notes ?? null,
      completed: true,
      setLogs: {
        create: sets.map((s) => ({
          workoutExerciseId: s.workoutExerciseId,
          setNumber: s.setNumber,
          weightKg: s.weightKg ?? null,
          repsCompleted: s.repsCompleted ?? null,
          completed: s.completed,
        })),
      },
    },
    select: { id: true },
  })

  // Marcar la sesión FUERZA del plan como completada (si existe hoy y no tiene log)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)
  const fuerzaSession = await prisma.plannedSession.findFirst({
    where: {
      week: { plan: { userId: athleteId, status: 'ACTIVE' } },
      type: 'FUERZA',
      date: { gte: today, lte: todayEnd },
      log: null,
    },
    select: { id: true },
  })

  if (fuerzaSession) {
    await prisma.sessionLog.create({
      data: {
        userId: athleteId,
        plannedSessionId: fuerzaSession.id,
        completedAt: new Date(),
        rpe: rpe ?? null,
        durationMin: durationMin ?? null,
        notes: notes ?? null,
      },
    })
  }

  return NextResponse.json({ sessionId: gymSession.id }, { status: 201 })
}
