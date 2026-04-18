import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id

  const templates = await prisma.workoutTemplate.findMany({
    where: { coachId },
    include: {
      days: {
        include: { exercises: { include: { exercise: true } } },
        orderBy: { order: 'asc' },
      },
      assignments: {
        where: { isActive: true },
        select: { id: true, athleteId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates)
}

interface DayExerciseInput {
  exerciseId: string
  sets: number
  repsScheme: string
  restSeconds?: number | null
  setType?: string
  notes?: string
  order: number
}

interface DayInput {
  dayOfWeek: number
  label: string
  muscleGroups: string[]
  isRestDay: boolean
  warmupNotes?: string
  cardioNotes?: string
  exercises: DayExerciseInput[]
}

interface CreateRoutineBody {
  name: string
  description?: string
  goal?: string
  level?: string
  daysPerWeek: number
  days: DayInput[]
}

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id
  const body: CreateRoutineBody = await req.json()

  const { name, description, goal, level, daysPerWeek, days } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  if (!days || days.length === 0) {
    return NextResponse.json({ error: 'La rutina debe tener al menos un día' }, { status: 400 })
  }

  // Validate that exercises reference valid exercise IDs the coach can use
  const exerciseIds = days
    .flatMap((d) => d.exercises.map((e) => e.exerciseId))
    .filter(Boolean)

  if (exerciseIds.length > 0) {
    const validExercises = await prisma.exercise.findMany({
      where: {
        id: { in: exerciseIds },
        OR: [{ coachId }, { isGlobal: true }],
      },
      select: { id: true },
    })

    const validIds = new Set(validExercises.map((e) => e.id))
    const invalidId = exerciseIds.find((id) => !validIds.has(id))

    if (invalidId) {
      return NextResponse.json(
        { error: `Ejercicio con id ${invalidId} no encontrado o no autorizado` },
        { status: 400 }
      )
    }
  }

  // Create everything in a transaction
  const template = await prisma.$transaction(async (tx) => {
    const tmpl = await tx.workoutTemplate.create({
      data: {
        coachId,
        name: name.trim(),
        description: description?.trim() || null,
        goal: goal || null,
        level: level || null,
        daysPerWeek,
      },
    })

    for (let i = 0; i < days.length; i++) {
      const day = days[i]

      const wDay = await tx.workoutDay.create({
        data: {
          templateId: tmpl.id,
          dayOfWeek: day.dayOfWeek,
          label: day.label || `Día ${day.dayOfWeek}`,
          muscleGroups: day.muscleGroups ?? [],
          isRestDay: day.isRestDay ?? false,
          warmupNotes: day.warmupNotes?.trim() || null,
          cardioNotes: day.cardioNotes?.trim() || null,
          order: i,
        },
      })

      if (!day.isRestDay && day.exercises && day.exercises.length > 0) {
        const validExs = day.exercises.filter((e) => e.exerciseId)

        for (let j = 0; j < validExs.length; j++) {
          const ex = validExs[j]
          await tx.workoutExercise.create({
            data: {
              dayId: wDay.id,
              exerciseId: ex.exerciseId,
              order: ex.order ?? j,
              sets: ex.sets ?? 4,
              repsScheme: ex.repsScheme?.trim() || '12',
              restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
              setType: (ex.setType as any) ?? 'NORMAL',
              notes: ex.notes?.trim() || null,
            },
          })
        }
      }
    }

    return tmpl
  })

  return NextResponse.json(template, { status: 201 })
}
