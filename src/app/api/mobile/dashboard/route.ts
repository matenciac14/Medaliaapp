import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { getDashboardSummary } from '@/domain/dashboard/get-dashboard-summary.use-case'
import { PlanStatus } from '@/generated/prisma/enums'
import { getPlanWeekNumber } from '@/lib/core/week-number'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:dashboard`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = mobile.id

  // PERF-01 Phase 1: plan metadata sin sesiones
  const [user, planMeta, checkIns, recentLogs, nutritionPlan, assignedWorkoutRaw, weeklyRoutine, recentGymSessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        profile: { select: { weightKg: true, hrResting: true, weightGoalKg: true, sleepHoursAvg: true, sportDetails: true, sportGoal: true } },
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: PlanStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, startDate: true, endDate: true, totalWeeks: true },
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
    prisma.weeklyRoutine.findUnique({ where: { userId } }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true },
      orderBy: { date: 'desc' },
      take: 60,
      select: { date: true },
    }),
  ])

  // PERF-01 Phase 2: cargar solo la semana actual con sesiones completas
  const currentWeekNum = planMeta ? getPlanWeekNumber(planMeta.startDate, planMeta.totalWeeks) : 0
  const planIsExpired = planMeta
    ? currentWeekNum > planMeta.totalWeeks && Date.now() > new Date(planMeta.endDate).getTime()
    : false

  const currentWeekData = planMeta && !planIsExpired ? await prisma.planWeek.findFirst({
    where: { planId: planMeta.id, weekNumber: currentWeekNum },
    include: { sessions: { include: { log: true }, orderBy: { dayOfWeek: 'asc' } } },
  }) : null

  const activePlanRaw = planMeta ? {
    ...planMeta,
    weeks: currentWeekData ? [currentWeekData] : [],
  } : null

  const lastCompletedPlan = activePlanRaw && !planIsExpired ? null : await prisma.trainingPlan.findFirst({
    where: { userId, status: PlanStatus.COMPLETED },
    orderBy: { endDate: 'desc' },
    select: { name: true, endDate: true },
  }).then(r => r?.endDate ? { name: r.name, endDate: new Date(r.endDate) } : null)

  // Map Prisma field names → domain names before passing to the pure use case
  const activePlan = activePlanRaw && !planIsExpired
    ? {
        ...activePlanRaw,
        weeks: activePlanRaw.weeks.map((w) => ({
          ...w,
          sessions: w.sessions.map((s) => ({
            ...s,
            zone:        s.zoneTarget,
            description: s.detailText,
            coachNotes:  s.coachNote,
          })),
        })),
      }
    : null

  const { summary, planIdToComplete } = getDashboardSummary({
    user, activePlanRaw: activePlan, lastCompletedPlan, checkIns, recentLogs, nutritionPlan,
    assignedWorkout: assignedWorkoutRaw ?? null,
    gymCompletionDates: recentGymSessions.map(gs => gs.date),
  })

  if (planIdToComplete) {
    prisma.trainingPlan.update({ where: { id: planIdToComplete }, data: { status: PlanStatus.COMPLETED } }).catch(() => {})
  }

  return NextResponse.json({ ...summary, weeklyRoutine: weeklyRoutine ? { daysPerWeek: weeklyRoutine.daysPerWeek, days: weeklyRoutine.days } : null })
}
