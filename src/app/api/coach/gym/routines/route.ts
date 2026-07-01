import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import type { SetType } from '@/generated/prisma/enums'
import { z } from 'zod'

const DayExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(20).optional(),
  repsScheme: z.string().max(50).optional(),
  restSeconds: z.number().int().min(0).max(600).nullable().optional(),
  setType: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  order: z.number().int().min(0),
  supersetWithOrder: z.number().int().nullable().optional(),
})

const DaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  label: z.string().max(100),
  muscleGroups: z.array(z.string().max(50)),
  isRestDay: z.boolean(),
  warmupNotes: z.string().max(1000).optional(),
  cardioNotes: z.string().max(1000).optional(),
  exercises: z.array(DayExerciseSchema),
})

const CreateRoutineSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  goal: z.string().max(200).optional(),
  level: z.string().max(100).optional(),
  daysPerWeek: z.number().int().min(1).max(7),
  days: z.array(DaySchema).min(1),
})

export async function GET(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
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

type DayExerciseInput = z.infer<typeof DayExerciseSchema>
type DayInput = z.infer<typeof DaySchema>
type CreateRoutineBody = z.infer<typeof CreateRoutineSchema>

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id
  const parsed = CreateRoutineSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })
  const body: CreateRoutineBody = parsed.data

  const { name, description, goal, level, daysPerWeek, days } = body

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

        // Phase 1: create exercises, collect order → id
        const orderToId = new Map<number, string>()
        for (let j = 0; j < validExs.length; j++) {
          const ex = validExs[j]
          const exOrder = ex.order ?? j
          const created = await tx.workoutExercise.create({
            data: {
              dayId: wDay.id,
              exerciseId: ex.exerciseId,
              order: exOrder,
              sets: ex.sets ?? 4,
              repsScheme: ex.repsScheme?.trim() || '12',
              restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
              setType: (ex.setType as SetType) ?? 'NORMAL',
              notes: ex.notes?.trim() || null,
            },
            select: { id: true },
          })
          orderToId.set(exOrder, created.id)
        }

        // Phase 2: resolve supersetWith by order → fresh ID
        for (let j = 0; j < validExs.length; j++) {
          const ex = validExs[j]
          if (ex.supersetWithOrder == null) continue
          const thisId = orderToId.get(ex.order ?? j)
          const pairedId = orderToId.get(ex.supersetWithOrder)
          if (thisId && pairedId) {
            await tx.workoutExercise.update({ where: { id: thisId }, data: { supersetWith: pairedId } })
          }
        }
      }
    }

    return tmpl
  })

  return NextResponse.json(template, { status: 201 })
}
