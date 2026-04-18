import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const sessions = await prisma.gymSession.findMany({
    where: { athleteId, completed: true },
    orderBy: { date: 'asc' },
    include: {
      setLogs: {
        include: {
          workoutExercise: {
            include: { exercise: true },
          },
        },
      },
    },
  })

  // Group by exercise → logs per session
  const exerciseMap: Record<
    string,
    {
      exerciseId: string
      name: string
      muscleGroups: string[]
      logs: {
        date: string
        sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null }[]
      }[]
    }
  > = {}

  for (const gymSession of sessions) {
    const dateStr = gymSession.date.toISOString().split('T')[0]

    // Group set logs by exercise within this session
    const byExercise: Record<string, typeof gymSession.setLogs> = {}
    for (const setLog of gymSession.setLogs) {
      const exId = setLog.workoutExercise.exercise.id
      if (!byExercise[exId]) byExercise[exId] = []
      byExercise[exId].push(setLog)
    }

    for (const [exId, logs] of Object.entries(byExercise)) {
      const ex = logs[0].workoutExercise.exercise
      if (!exerciseMap[exId]) {
        exerciseMap[exId] = {
          exerciseId: exId,
          name: ex.name,
          muscleGroups: ex.muscleGroups,
          logs: [],
        }
      }
      exerciseMap[exId].logs.push({
        date: dateStr,
        sets: logs
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((l) => ({
            setNumber: l.setNumber,
            weightKg: l.weightKg != null ? Number(l.weightKg) : null,
            repsCompleted: l.repsCompleted,
          })),
      })
    }
  }

  return NextResponse.json(Object.values(exerciseMap))
}
