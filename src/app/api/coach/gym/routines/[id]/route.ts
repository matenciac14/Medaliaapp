import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// GET /api/coach/gym/routines/[id] — cargar rutina con días y ejercicios para editar
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const coachId = session.user.id

  const template = await prisma.workoutTemplate.findFirst({
    where: { id, coachId },
    include: {
      days: {
        orderBy: { order: 'asc' },
        include: {
          exercises: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  })

  if (!template) {
    return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
  }

  return NextResponse.json(template)
}

interface DayExerciseInput {
  exerciseId: string
  sets: number
  repsScheme: string
  restSeconds?: number | null
  setType?: string
  notes?: string
  order: number
  supersetWithOrder?: number | null  // order del ejercicio par en el mismo día (no ID — el PATCH recrea IDs)
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

interface UpdateRoutineBody {
  name: string
  description?: string
  goal?: string
  level?: string
  daysPerWeek: number
  days: DayInput[]
}

// PATCH /api/coach/gym/routines/[id] — actualizar rutina (reemplaza días y ejercicios)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const coachId = session.user.id

  const existing = await prisma.workoutTemplate.findFirst({
    where: { id, coachId },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
  }

  const body: UpdateRoutineBody = await req.json()
  const { name, description, goal, level, daysPerWeek, days } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  // Validar ejercicios accesibles por este coach
  const exerciseIds = days
    .flatMap((d) => d.exercises.map((e) => e.exerciseId))
    .filter(Boolean)

  if (exerciseIds.length > 0) {
    const valid = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds }, OR: [{ coachId }, { isGlobal: true }] },
      select: { id: true },
    })
    const validIds = new Set(valid.map((e) => e.id))
    const invalidId = exerciseIds.find((eid) => !validIds.has(eid))
    if (invalidId) {
      return NextResponse.json({ error: `Ejercicio ${invalidId} no autorizado` }, { status: 400 })
    }
  }

  // Transacción: actualizar template + borrar días anteriores + recrear
  const updated = await prisma.$transaction(async (tx) => {
    const tmpl = await tx.workoutTemplate.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        goal: goal || null,
        level: level || null,
        daysPerWeek,
      },
    })

    // Cascade via WorkoutDay → WorkoutExercise (onDelete: Cascade en schema)
    await tx.workoutDay.deleteMany({ where: { templateId: id } })

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

      if (!day.isRestDay && day.exercises?.length > 0) {
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
              setType: (ex.setType as any) ?? 'NORMAL',
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

  return NextResponse.json(updated)
}
