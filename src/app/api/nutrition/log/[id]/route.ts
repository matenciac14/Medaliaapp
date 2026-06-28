import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const userId = session.user.id

  const log = await prisma.foodLog.findUnique({ where: { id }, select: { userId: true } })
  if (!log) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  if (log.userId !== userId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.foodLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
