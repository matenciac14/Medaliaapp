import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// GET /api/athlete/nutrition/templates — templates nutricionales propios del atleta B2C
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const userId = session.user.id

  const templates = await prisma.nutritionTemplate.findMany({
    where: { athleteId: userId, coachId: null },
    include: {
      days: {
        include: {
          meals: { include: { items: { include: { food: { select: { name: true } } } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
}

// POST /api/athlete/nutrition/templates — crea template nutricional propio (source: ATHLETE)
// Solo atletas B2C sin coach activo pueden crear sus propios templates
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const userId = session.user.id

  // Verificar que el atleta no tiene coach activo — los atletas B2B usan templates del coach
  const hasCoach = await prisma.coachAthlete.findFirst({
    where: { athleteId: userId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (hasCoach) {
    return NextResponse.json(
      { error: 'Tu entrenador gestiona tu plan nutricional.' },
      { status: 403 }
    )
  }

  const body = await req.json() as { name?: string; description?: string; goal?: string }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name es requerido.' }, { status: 400 })

  const template = await prisma.nutritionTemplate.create({
    data: {
      athleteId: userId,
      name,
      description: body.description?.trim() || null,
      goal: body.goal?.trim() || null,
      days: {
        create: [
          { dayType: 'HARD' },
          { dayType: 'EASY' },
          { dayType: 'REST' },
        ],
      },
    },
    include: {
      days: { include: { meals: { include: { items: true } } } },
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}
