import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const coachId = session.user.id
  const suffix = Math.random().toString(36).substr(2, 6).toUpperCase()
  const code = `MEDAL-${suffix}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días

  await prisma.inviteCode.create({
    data: { code, coachId, expiresAt },
  })

  return NextResponse.json({ code, url: `/join/${code}` })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Devuelve los códigos activos del coach
  const codes = await prisma.inviteCode.findMany({
    where: {
      coachId: session.user.id,
      usedBy: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: { code: true, expiresAt: true, createdAt: true },
  })

  return NextResponse.json({ codes })
}
