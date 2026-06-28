import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { getDashboardSummary } from '@/domain/dashboard/get-dashboard-summary.use-case'
import { PlanStatus } from '@/generated/prisma/enums'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:dashboard`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = mobile.id

  const [user, activePlanRaw, checkIns, recentLogs, nutritionPlan, assignedWorkoutRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, config: true,
        profile: { select: { weightKg: true, hrResting: true, weightGoalKg: true, sleepHoursAvg: true, sportDetails: true } },
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: PlanStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: {
          include: { sessions: { include: { log: true } } },
          orderBy: { weekNumber: 'asc' },
        },
      },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 12,
      select: { recordedAt: true, weekNumber: true, weightKg: true, hrResting: true, sleepHours: true, energyLevel: true, hardestSessionRpe: true },
    }),
    prisma.sessionLog.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 60,
      select: {
        completedAt: true,
        freeSessionType: true,
        durationMin: true,
        rpe: true,
        plannedSession: { select: { type: true } },
      },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: { template: { select: { days: { select: { dayOfWeek: true, isRestDay: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const lastCompletedPlan = activePlanRaw ? null : await prisma.trainingPlan.findFirst({
    where: { userId, status: PlanStatus.COMPLETED },
    orderBy: { endDate: 'desc' },
    select: { name: true, endDate: true },
  }).then(r => r?.endDate ? { name: r.name, endDate: new Date(r.endDate) } : null)

  const { summary, planIdToComplete } = getDashboardSummary({
    user, activePlanRaw, lastCompletedPlan, checkIns, recentLogs, nutritionPlan,
    assignedWorkout: assignedWorkoutRaw ?? null,
  })

  if (planIdToComplete) {
    prisma.trainingPlan.update({ where: { id: planIdToComplete }, data: { status: PlanStatus.COMPLETED } }).catch(() => {})
  }

  return NextResponse.json(summary)
}
