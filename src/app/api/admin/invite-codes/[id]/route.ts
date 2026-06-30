import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// DELETE /api/admin/invite-codes/[id] — revocar código
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (admin?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const code = await prisma.inviteCode.findUnique({ where: { id }, select: { id: true } })
  if (!code) return NextResponse.json({ error: 'Código no encontrado.' }, { status: 404 })

  await prisma.inviteCode.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
