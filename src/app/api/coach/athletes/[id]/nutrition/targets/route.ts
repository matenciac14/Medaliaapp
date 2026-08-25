import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const Schema = z.object({
  targetKcalHard: z.number().int().min(500).max(10000).optional(),
  targetKcalEasy: z.number().int().min(500).max(10000).optional(),
  targetKcalRest: z.number().int().min(500).max(10000).optional(),
  proteinG: z.number().int().min(30).max(500).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  // Verify coach owns this athlete
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!relation) return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const data = parsed.data
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })

  const updated = await prisma.nutritionPlan.update({
    where: { userId: athleteId },
    data: {
      ...data,
      source: 'COACH', // marca que el coach sobreescribió los targets
    },
    select: { targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true, proteinG: true, source: true },
  })

  return NextResponse.json(updated)
}
