import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = (await request.json()) as { hard?: unknown; easy?: unknown; rest?: unknown }
  if (!body.hard || !body.easy || !body.rest) {
    return NextResponse.json({ error: 'Se requieren los tres tipos de día: hard, easy, rest' }, { status: 400 })
  }

  const mealPlan = await prisma.mealPlan.upsert({
    where: { userId: athleteId },
    create: { userId: athleteId, data: body as object },
    update: { data: body as object, updatedAt: new Date() },
  })

  return NextResponse.json({ ok: true, mealPlanId: mealPlan.id })
}
