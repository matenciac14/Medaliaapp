import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

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

  const workoutDay = gymSession.assignedWorkout?.template.days.find(
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
    templateName: gymSession.assignedWorkout?.template.name ?? '',
    setLogs: gymSession.setLogs.map((sl) => ({
      id: sl.id,
      setNumber: sl.setNumber,
      weightKg: sl.weightKg,
      repsCompleted: sl.repsCompleted,
      completed: sl.completed,
      notes: sl.notes,
      exercise: sl.workoutExercise?.exercise ?? { name: sl.exerciseName ?? 'Ejercicio', id: sl.workoutExerciseId ?? '' },
      workoutExerciseId: sl.workoutExerciseId,
    })),
  })
}
