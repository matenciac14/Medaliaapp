import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const coachId = session.user.id
  const { athleteId } = (await req.json()) as { athleteId: string }

  if (!athleteId) {
    return NextResponse.json({ error: 'athleteId requerido' }, { status: 400 })
  }

  const athlete = await prisma.user.findUnique({
    where: { id: athleteId },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!athlete || athlete.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  // Verificar que no existe ya la relación con este coach
  const existing = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId } },
  })
  if (existing) {
    return NextResponse.json({ error: 'El atleta ya está vinculado a este coach' }, { status: 409 })
  }

  // Verificar si el atleta ya tiene otro coach activo
  const otherCoach = await prisma.coachAthlete.findFirst({
    where: { athleteId, coachId: { not: coachId } },
    select: { coach: { select: { name: true } } },
  })
  if (otherCoach) {
    return NextResponse.json(
      { error: `Este atleta ya tiene un coach asignado (${otherCoach.coach.name ?? 'otro coach'}). El atleta debe desvincular su cuenta antes de poder vincularse a otro coach.` },
      { status: 409 }
    )
  }

  await prisma.coachAthlete.create({ data: { coachId, athleteId } })

  return NextResponse.json({
    ok: true,
    athlete: { id: athlete.id, name: athlete.name, email: athlete.email },
  }, { status: 201 })
}
