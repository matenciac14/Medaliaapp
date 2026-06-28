import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// GET /api/messages/me — devuelve userId + coachId + coachName del atleta actual
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const coachRelation = await prisma.coachAthlete.findFirst({
    where: { athleteId: userId },
    select: { coach: { select: { id: true, name: true } } },
  })

  return NextResponse.json({
    id: userId,
    coachId: coachRelation?.coach.id ?? null,
    coachName: coachRelation?.coach.name ?? null,
  })
}
