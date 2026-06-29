import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; weekId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId, weekId } = await params
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

  const { phase, focusDescription, isRecoveryWeek, volumeKm } = await req.json()

  const updated = await prisma.planWeek.update({
    where: { id: weekId },
    data: {
      ...(phase !== undefined && { phase }),
      ...(focusDescription !== undefined && { focusDescription }),
      ...(isRecoveryWeek !== undefined && { isRecoveryWeek }),
      ...(volumeKm !== undefined && { volumeKm: volumeKm === null ? null : Number(volumeKm) }),
    },
    select: { id: true, phase: true, focusDescription: true, isRecoveryWeek: true, volumeKm: true },
  })

  return NextResponse.json({ ok: true, week: updated })
}
