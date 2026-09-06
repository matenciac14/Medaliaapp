import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:checkin-status`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'checkin')
  if (featureGuard) return NextResponse.json({ pending: false, locked: true })

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const last = await prisma.weeklyCheckIn.findFirst({
    where: { userId: mobile.id },
    orderBy: { recordedAt: 'desc' },
    select: { recordedAt: true, energyLevel: true, weightKg: true },
  })

  return NextResponse.json({
    pending: !last || last.recordedAt < weekAgo,
    lastCheckin: last
      ? { createdAt: last.recordedAt.toISOString(), energyLevel: last.energyLevel, weightKg: last.weightKg ?? null }
      : null,
  })
}
