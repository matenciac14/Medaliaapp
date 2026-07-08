import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id

  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [{ coachId }, { coachId: null }],
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(exercises)
}

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id

  const body = await req.json()
  const { name, bodyPart, target, equipment, description, gifUrl } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  if (!bodyPart?.trim()) {
    return NextResponse.json({ error: 'La parte del cuerpo (bodyPart) es obligatoria' }, { status: 400 })
  }

  if (!target?.trim()) {
    return NextResponse.json({ error: 'El músculo objetivo (target) es obligatorio' }, { status: 400 })
  }

  if (!equipment?.trim()) {
    return NextResponse.json({ error: 'El equipamiento es obligatorio' }, { status: 400 })
  }

  const exercise = await prisma.exercise.create({
    data: {
      coachId,
      name:        name.trim(),
      bodyPart:    bodyPart.trim(),
      target:      target.trim(),
      equipment:   equipment.trim(),
      description: description?.trim() || null,
      gifUrl:      gifUrl?.trim() || null,
      source:      'custom',
    },
  })

  return NextResponse.json(exercise, { status: 201 })
}
