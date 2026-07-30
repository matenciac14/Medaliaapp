import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

async function approvePlan(planId: string, coachId: string) {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    select: { id: true, userId: true },
  })
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado.' }, { status: 404 })

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId: plan.userId },
  })
  if (!relation) return NextResponse.json({ error: 'No autorizado para este atleta.' }, { status: 403 })

  await prisma.trainingPlan.update({
    where: { id: planId },
    data: { generatedBy: 'AI_COACH_APPROVED' },
  })

  return NextResponse.json({ ok: true, status: 'APROBADO', planId })
}

// PATCH /api/coach/plan/[planId]/approve
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { planId } = await params
  try {
    return await approvePlan(planId, session.user.id)
  } catch (err) {
    console.error('[coach/plan/approve PATCH]', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

// POST kept for backwards-compat with older client code
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { planId } = await params
  try {
    return await approvePlan(planId, session.user.id)
  } catch (err) {
    console.error('[coach/plan/approve POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
