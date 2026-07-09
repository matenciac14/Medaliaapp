import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:notifications`, { limit: 120, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const notifications = await prisma.notification.findMany({
    where: { userId: mobile.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, type: true, title: true, body: true, read: true, metadata: true, createdAt: true },
  })

  const unreadCount = notifications.filter(n => !n.read).length
  return NextResponse.json({ notifications, unreadCount })
}
