import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mobile = await getMobileUser(_req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-log-delete`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const { id } = await params
  const userId = mobile.id

  const log = await prisma.foodLog.findUnique({ where: { id }, select: { userId: true } })
  if (!log) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  if (log.userId !== userId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.foodLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
