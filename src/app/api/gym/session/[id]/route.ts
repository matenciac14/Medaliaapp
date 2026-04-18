import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const athleteId = session.user.id

  const gymSession = await prisma.gymSession.findFirst({
    where: { id, athleteId },
    include: {
      setLogs: {
        include: {
          workoutExercise: {
            include: {
              exercise: { select: { name: true, muscleGroups: true, equipment: true } },
            },
          },
        },
        orderBy: [{ workoutExercise: { order: 'asc' } }, { setNumber: 'asc' }],
      },
      assignedWorkout: {
        include: {
          template: {
            include: {
              days: {
                select: { dayOfWeek: true, label: true, muscleGroups: true },
              },
            },
          },
        },
      },
    },
  })

  if (!gymSession) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  const workoutDay = gymSession.assignedWorkout.template.days.find(
    (d) => d.dayOfWeek === gymSession.dayOfWeek
  )

  return NextResponse.json({
    id: gymSession.id,
    date: gymSession.date,
    dayOfWeek: gymSession.dayOfWeek,
    dayLabel: workoutDay?.label ?? '',
    muscleGroups: workoutDay?.muscleGroups ?? [],
    durationMin: gymSession.durationMin,
    rpe: gymSession.rpe,
    notes: gymSession.notes,
    completed: gymSession.completed,
    templateName: gymSession.assignedWorkout.template.name,
    setLogs: gymSession.setLogs.map((sl) => ({
      id: sl.id,
      setNumber: sl.setNumber,
      weightKg: sl.weightKg,
      repsCompleted: sl.repsCompleted,
      completed: sl.completed,
      notes: sl.notes,
      exercise: sl.workoutExercise.exercise,
      workoutExerciseId: sl.workoutExerciseId,
    })),
  })
}
