import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: athleteId } = await params
  const { status } = await req.json() as { status: 'ACTIVE' | 'PAUSED' }

  if (status !== 'ACTIVE' && status !== 'PAUSED') {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  await prisma.coachAthlete.update({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
    data: { status },
  })

  return NextResponse.json({ ok: true, status })
}
