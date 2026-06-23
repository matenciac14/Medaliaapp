import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getSessionIntensity } from '@/lib/plan/intensity'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await params
  const coachId = session.user.id

  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    select: { userId: true },
  })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId: plan.userId } },
  })
  if (!relation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { weekId, dayOfWeek, type, durationMin, zoneTarget, detailText } = body

  if (!weekId || dayOfWeek === undefined || !type || !durationMin)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const week = await prisma.planWeek.findUnique({ where: { id: weekId } })
  if (!week || week.planId !== planId)
    return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  const sessionDate = new Date(week.startDate)
  // week.startDate = Monday (dow 1). dayOfWeek 1→+0 days, 2→+1, ..., 7→+6
  sessionDate.setDate(sessionDate.getDate() + Number(dayOfWeek) - 1)

  const newSession = await prisma.plannedSession.create({
    data: {
      weekId,
      dayOfWeek: Number(dayOfWeek),
      type,
      intensity: getSessionIntensity(type),
      durationMin: Number(durationMin),
      zoneTarget: zoneTarget?.trim() || null,
      detailText: detailText?.trim() || null,
      date: sessionDate,
    },
  })

  return NextResponse.json({ ok: true, session: newSession })
}
