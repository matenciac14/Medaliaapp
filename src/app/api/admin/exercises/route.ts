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

// GET /api/admin/exercises — lista ejercicios globales
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const exercises = await prisma.exercise.findMany({
    where: { coachId: null, isGlobal: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, category: true, equipment: true,
      muscleGroups: true, description: true, tips: true, isGlobal: true,
    },
  })

  return NextResponse.json({ exercises })
}

// POST /api/admin/exercises — crear ejercicio global
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const errors = validateExercise(body)
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const exercise = await prisma.exercise.create({
    data: {
      name:         body.name.trim(),
      category:     body.category,
      equipment:    body.equipment,
      muscleGroups: body.muscleGroups,
      description:  body.description?.trim() || null,
      tips:         body.tips?.trim() || null,
      coachId:      null,
      isGlobal:     true,
    },
    select: { id: true, name: true, category: true, equipment: true, muscleGroups: true },
  })

  return NextResponse.json({ exercise }, { status: 201 })
}
