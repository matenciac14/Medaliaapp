import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { logAdminAction } from '@/lib/admin/log_action'
import { ADMIN_ACTIONS } from '@/domain/admin/audit_log'
import type { CoachSubscriptionTier } from '@/generated/prisma/client'

const VALID_TIERS: CoachSubscriptionTier[] = ['STARTER', 'GROWTH', 'PRO', 'SCALE']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (adminUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { coachTier } = body

  if (!VALID_TIERS.includes(coachTier)) {
    return NextResponse.json({ error: 'Tier inválido.' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, subscription: { select: { coachTier: true } } },
  })

  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
  }
  if (target.role !== 'COACH') {
    return NextResponse.json({ error: 'El usuario no es un coach.' }, { status: 400 })
  }

  await prisma.userSubscription.upsert({
    where: { userId: id },
    create: { userId: id, coachTier },
    update: { coachTier },
  })

  await logAdminAction(session.user.id, ADMIN_ACTIONS.CHANGE_PLAN, id, {
    plan: `coachTier:${target.subscription?.coachTier ?? 'STARTER'}→${coachTier}`,
  })

  return NextResponse.json({ ok: true, coachTier })
}
