import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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
