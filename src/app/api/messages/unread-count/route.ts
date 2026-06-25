import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// GET /api/messages/unread-count — badge en sidebar
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.message.count({
    where: { toId: session.user.id, readAt: null },
  })

  return NextResponse.json({ count })
}
