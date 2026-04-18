import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

type SetPayload = {
  workoutExerciseId: string
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
  completed: boolean
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const athleteId = session.user.id

  let body: {
    assignedWorkoutId: string
    dayOfWeek: number
    rpe?: number
    durationMin?: number
    notes?: string
    sets: SetPayload[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { assignedWorkoutId, dayOfWeek, rpe, durationMin, notes, sets } = body

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

  return NextResponse.json({ sessionId: gymSession.id }, { status: 201 })
}
