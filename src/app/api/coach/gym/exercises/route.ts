import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(_req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id

  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [{ coachId }, { isGlobal: true }],
    },
    orderBy: [{ isGlobal: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(exercises)
}

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id

  const body = await req.json()
  const { name, muscleGroups, equipment, category, description, tips, imageUrl } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  if (!muscleGroups || muscleGroups.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos un grupo muscular' }, { status: 400 })
  }

  const exercise = await prisma.exercise.create({
    data: {
      coachId,
      name: name.trim(),
      muscleGroups,
      equipment: equipment ?? 'BARBELL',
      category: category ?? 'COMPOUND',
      description: description?.trim() || null,
      tips: tips?.trim() || null,
      imageUrl: imageUrl || null,
      isGlobal: false,
    },
  })

  return NextResponse.json(exercise, { status: 201 })
}
