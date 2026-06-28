import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// PATCH /api/messages/read — { fromId } → marca como leídos todos los mensajes de fromId al usuario actual
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fromId } = await req.json()
  if (!fromId) return NextResponse.json({ error: 'fromId requerido' }, { status: 400 })

  const { count } = await prisma.message.updateMany({
    where: { fromId, toId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  })

  return NextResponse.json({ marked: count })
}
