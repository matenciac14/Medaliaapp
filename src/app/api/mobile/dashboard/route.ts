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
  const todayUtc = new Date(); todayUtc.setHours(0, 0, 0, 0)
  const [user, planMeta, checkIns, recentLogs, nutritionPlan, assignedWorkoutRaw, weeklyRoutine, recentGymSessions, todayLog, coachRelation, pendingSuggestionsCount] = await Promise.all([
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
      select: { template: { select: { name: true, days: { select: { dayOfWeek: true, isRestDay: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.weeklyRoutine.findUnique({ where: { userId } }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true },
      orderBy: { date: 'desc' },
      take: 60,
      select: { date: true, durationMin: true, assignedWorkout: { select: { template: { select: { name: true } } } } },
    }),
    // DAILY-02: registro de hoy para widget en dashboard
    prisma.dailyLog.findUnique({
      where: { userId_date: { userId, date: todayUtc } },
      select: { weightKg: true, energyLevel: true },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId: userId },
      select: {
        coach: {
          select: {
            name: true,
            coachProfile: { select: { headline: true } },
          },
        },
      },
    }),
    prisma.checkInSuggestion.count({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
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
    recentGymSessions: recentGymSessions.map(gs => ({
      date: gs.date,
      durationMin: gs.durationMin ?? null,
      templateName: gs.assignedWorkout?.template.name ?? null,
    })),
  })

  // When a plan just auto-completes, fetch stats to show the season-completed modal
  let justCompletedPlan: { name: string; totalWeeks: number; totalSessions: number; totalKm: number | null; seasonNumber: number; adherencePct: number | null } | null = null

  async function buildJustCompletedPlan(planId: string, name: string, totalWeeks: number, isNewCompletion: boolean) {
    const [sessionCount, kmAgg, completedCount, plannedCount] = await Promise.all([
      prisma.sessionLog.count({ where: { userId, plannedSession: { week: { planId } } } }),
      prisma.sessionLog.aggregate({
        where: { userId, plannedSession: { week: { planId } } },
        _sum: { distanceKm: true },
      }),
      prisma.trainingPlan.count({ where: { userId, status: PlanStatus.COMPLETED } }),
      prisma.plannedSession.count({ where: { week: { planId } } }),
    ])
    return {
      name,
      totalWeeks,
      totalSessions: sessionCount,
      totalKm: kmAgg._sum.distanceKm ? Math.round(kmAgg._sum.distanceKm) : null,
      // isNewCompletion: plan not yet marked COMPLETED → +1 for the season number
      seasonNumber: isNewCompletion ? completedCount + 1 : completedCount,
      adherencePct: plannedCount > 0 ? Math.round((sessionCount / plannedCount) * 100) : null,
    }
  }

  if (planIdToComplete && planMeta) {
    justCompletedPlan = await buildJustCompletedPlan(planIdToComplete, planMeta.name, planMeta.totalWeeks, true)
    prisma.trainingPlan.update({ where: { id: planIdToComplete }, data: { status: PlanStatus.COMPLETED } }).catch((err) => {
      console.error('[dashboard] failed to auto-complete plan', planIdToComplete, err)
    })
  }

  // Gap fix: if no justCompletedPlan from this request, check for recently completed plans
  // so the season modal still shows if the user opens the app after plan auto-completed on a previous request
  if (!justCompletedPlan) {
    const recentlyCompleted = await prisma.trainingPlan.findFirst({
      where: {
        userId,
        status: PlanStatus.COMPLETED,
        endDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { endDate: 'desc' },
      select: { id: true, name: true, totalWeeks: true },
    })
    if (recentlyCompleted) {
      justCompletedPlan = await buildJustCompletedPlan(recentlyCompleted.id, recentlyCompleted.name, recentlyCompleted.totalWeeks, false)
    }
  }

  return NextResponse.json({
    ...summary,
    weeklyRoutine: weeklyRoutine ? { daysPerWeek: weeklyRoutine.daysPerWeek, days: weeklyRoutine.days } : null,
    todayLog: todayLog ?? null,
    hasEverLogged: summary.hasEverLogged,
    coach: coachRelation ? {
      name: coachRelation.coach.name ?? 'Tu coach',
      headline: coachRelation.coach.coachProfile?.headline ?? null,
      initial: (coachRelation.coach.name ?? 'C').charAt(0).toUpperCase(),
    } : null,
    isB2B: !!coachRelation,
    workoutName: assignedWorkoutRaw?.template.name ?? null,
    justCompletedPlan,
    pendingSuggestionsCount,
  })
}
