import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const adjustment = await prisma.pendingNutritionAdjustment.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  })
  if (!adjustment || adjustment.userId !== session.user.id) {
    return NextResponse.json({ error: 'Ajuste no encontrado' }, { status: 404 })
  }
  if (adjustment.status !== 'PENDING') {
    return NextResponse.json({ error: 'El ajuste ya fue procesado' }, { status: 409 })
  }

  await prisma.pendingNutritionAdjustment.update({
    where: { id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
