import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { validateExercise } from '@/domain/admin/exercise'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return u?.role === 'ADMIN' ? session : null
}

// GET /api/admin/exercises — lista ejercicios globales (coachId null)
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const exercises = await prisma.exercise.findMany({
    where: { coachId: null },
    orderBy: [{ bodyPart: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, bodyPart: true, target: true, equipment: true,
      mechanic: true, description: true, gifUrl: true, source: true,
    },
  })

  return NextResponse.json({ exercises })
}

// POST /api/admin/exercises — crear ejercicio global manual
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const errors = validateExercise(body)
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const exercise = await prisma.exercise.create({
    data: {
      name:        body.name.trim(),
      bodyPart:    body.bodyPart.trim(),
      target:      body.target.trim(),
      equipment:   body.equipment.trim(),
      mechanic:    body.mechanic?.trim() || null,
      description: body.description?.trim() || null,
      gifUrl:      body.gifUrl?.trim() || null,
      coachId:     null,
      source:      'manual',
    },
    select: { id: true, name: true, bodyPart: true, target: true, equipment: true },
  })

  return NextResponse.json({ exercise }, { status: 201 })
}
