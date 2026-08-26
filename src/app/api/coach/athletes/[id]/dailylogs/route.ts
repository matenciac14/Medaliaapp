import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const coachRelation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
    select: { id: true },
  })
  if (!coachRelation) return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })

  const since = new Date()
  since.setDate(since.getDate() - 7)
  since.setHours(0, 0, 0, 0)

  const logs = await prisma.dailyLog.findMany({
    where: { userId: athleteId, date: { gte: since } },
    orderBy: { date: 'desc' },
    select: { date: true, weightKg: true, energyLevel: true, hrResting: true, sleepHours: true },
  })

  return NextResponse.json({ logs })
}
