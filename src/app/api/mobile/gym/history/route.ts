import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const athleteId = mobile.id

  const sessions = await prisma.gymSession.findMany({
    where: { athleteId },
    orderBy: { date: 'desc' },
    take: 50,
    include: {
      setLogs: {
        include: {
          workoutExercise: {
            include: { exercise: { select: { name: true } } },
          },
        },
        orderBy: [{ workoutExercise: { order: 'asc' } }, { setNumber: 'asc' }],
      },
      assignedWorkout: {
        include: {
          template: {
            include: {
              days: { select: { dayOfWeek: true, label: true, muscleGroups: true } },
            },
          },
        },
      },
    },
  })

  const formatted = sessions.map(gs => {
    const workoutDay = gs.assignedWorkout.template.days.find(d => d.dayOfWeek === gs.dayOfWeek)

    const exerciseMap: Record<string, { name: string; sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; completed: boolean }[] }> = {}
    for (const sl of gs.setLogs) {
      const key = sl.workoutExerciseId
      if (!exerciseMap[key]) exerciseMap[key] = { name: sl.workoutExercise.exercise.name, sets: [] }
      exerciseMap[key].sets.push({
        setNumber: sl.setNumber,
        weightKg: sl.weightKg,
        repsCompleted: sl.repsCompleted,
        completed: sl.completed,
      })
    }

    const completedSets = gs.setLogs.filter(sl => sl.completed).length
    const volume = gs.setLogs
      .filter(sl => sl.completed)
      .reduce((acc, sl) => acc + (sl.weightKg ?? 0) * (sl.repsCompleted ?? 0), 0)

    return {
      id: gs.id,
      date: gs.date.toISOString(),
      dayOfWeek: gs.dayOfWeek,
      label: workoutDay?.label ?? 'Sesión',
      muscleGroups: workoutDay?.muscleGroups ?? [],
      durationMin: gs.durationMin,
      rpe: gs.rpe,
      completed: gs.completed,
      notes: gs.notes,
      completedSets,
      volumeKg: Math.round(volume),
      exercises: Object.values(exerciseMap),
    }
  })

  const totalVolume = formatted.reduce((acc, s) => acc + s.volumeKg, 0)

  return NextResponse.json({
    sessions: formatted,
    stats: {
      total: sessions.length,
      completed: sessions.filter(s => s.completed).length,
      totalSets: sessions.reduce((acc, s) => acc + s.setLogs.filter(sl => sl.completed).length, 0),
      totalVolumeKg: totalVolume,
    },
  })
}
