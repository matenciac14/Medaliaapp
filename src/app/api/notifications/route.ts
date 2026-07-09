import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = session.user.id
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, type: true, title: true, body: true, read: true, metadata: true, createdAt: true },
  })

  const unreadCount = notifications.filter(n => !n.read).length
  return NextResponse.json({ notifications, unreadCount })
}
