import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { logAdminAction } from '@/lib/admin/log_action'
import { ADMIN_ACTIONS } from '@/domain/admin/audit_log'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verificar rol en DB, no en JWT (consistente con otros endpoints de admin)
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { role } = await req.json()

  const VALID_ROLES = ['ATHLETE', 'COACH', 'ADMIN']
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const now = new Date()

  // Leer rol anterior para el audit log
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })

  const featuresByRole: Record<string, object> = {
    ATHLETE: {
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureCoach: false, featureGym: true,
    },
    COACH: {
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureCoach: true, featureGym: false,
      onboardingCompleted: true, onboardingCompletedAt: now,
    },
    ADMIN: {
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureCoach: false, featureGym: false,
    },
  }

  await prisma.user.update({ where: { id }, data: { role, ...featuresByRole[role] } })

  void logAdminAction(session.user.id, ADMIN_ACTIONS.CHANGE_ROLE, id, { from: target?.role ?? '?', to: role })

  return NextResponse.json({ ok: true })
}
