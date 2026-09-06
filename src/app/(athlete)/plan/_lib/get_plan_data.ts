import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily_target'
import { getSessionIntensity } from '@/domain/plan/intensity'
import { calculateHRZones } from '@/domain/plan/formulas'
import { todayDowInTz } from '@/lib/core/date_utils'
import { buildCalendarWeek } from '@/infrastructure/db/calendar'
import { computeFoodTotals } from '@/infrastructure/db/dashboard_queries'
import { loadAthleteData } from '@/infrastructure/db/athlete_loader'
import { DAY_LABELS } from '@/lib/constants/sessions'
import {
  handlePlanLifecycle,
  computeWeightData,
  extractCheckInData,
  computeRaceDays,
} from '@/infrastructure/db/shared_athlete_data'
import type { PlanPageData, NutritionTarget, FoodTotals, HRZones } from './plan.types'

// Re-export types for consumers
export type { PlanPageData }

// ── Main ─────────────────────────────────────────────────────────────────

export async function getPlanPageData(userId: string, isB2B: boolean): Promise<PlanPageData> {
  // ── Single parallel fetch — loader handles shared slices ───────────────
  // Fetch user timezone for date-boundary calculations
  const userTz = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  }).then(u => u?.timezone ?? undefined)

  const [
    slices,
    activePlansData,
    calWeek,
  ] = await Promise.all([
    loadAthleteData(userId, [
      'healthProfile', 'nutritionPlan', 'coachRelation',
      'checkIns', 'oldestWeightCheckIn', 'pendingSuggestions', 'todayFood',
    ], { timezone: userTz }),
    prisma.trainingPlan.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { dayOfWeek: 'asc' },
              include: { log: true },
            },
          },
        },
      },
    }),
    buildCalendarWeek(userId, 0, userTz),
  ])

  const profileDataRaw = slices.healthProfile
  const nutritionPlanData = slices.nutritionPlan
  const coachAthleteData = slices.coachRelation
  const checkIns = slices.checkIns.slice(0, 2)
  const oldestCheckIn = slices.oldestWeightCheckIn
  const pendingSuggestionsCount = slices.pendingSuggestions
  const todayFoodLogs = slices.todayFood

  // ── Plan lifecycle (dedup + expiration) ───────────────────────────────
  const { activePlan: activePlanData, expiredSnapshot } = handlePlanLifecycle(activePlansData)

  // ── Shared derived data ──────────────────────────────────────────────
  const weightData = computeWeightData(
    profileDataRaw?.weightKg ?? null,
    profileDataRaw?.weightGoalKg ?? null,
    checkIns,
    oldestCheckIn?.weightKg ?? null,
  )

  const { checkInData, bodyMeasures } = extractCheckInData(checkIns)

  const hrZones: HRZones | null = profileDataRaw?.hrMax
    ? calculateHRZones(profileDataRaw.hrMax, profileDataRaw.hrResting ?? 0)
    : null

  const todayConsumed: FoodTotals = computeFoodTotals(todayFoodLogs) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }

  const coachName = coachAthleteData?.coach?.name?.split(' ')[0] ?? null
  const raceDays = computeRaceDays(profileDataRaw?.sportDetails)

  // ── Nutrition target (REST intensity default) ────────────────────────
  let nutritionTarget: NutritionTarget | null = null
  if (nutritionPlanData) {
    const nt = getDailyNutritionTarget(null, {
      targetKcalHard: nutritionPlanData.targetKcalHard,
      targetKcalEasy: nutritionPlanData.targetKcalEasy,
      targetKcalRest: nutritionPlanData.targetKcalRest,
      proteinG: nutritionPlanData.proteinG,
      carbsHardG: nutritionPlanData.carbsHardG,
      carbsEasyG: nutritionPlanData.carbsEasyG,
      fatG: nutritionPlanData.fatG,
    })
    nutritionTarget = { kcal: nt.kcal, proteinG: nt.proteinG, carbsG: nt.carbsG, fatG: nt.fatG, label: nt.label }
  }

  // Shared return fields (avoids repeating in every branch)
  const shared = {
    initialCalendarWeek: calWeek,
    nutritionTarget,
    todayConsumed,
    weightData,
    checkInData,
    bodyMeasures,
    hrZones,
    coachName,
    raceDays,
    pendingSuggestionsCount: pendingSuggestionsCount ?? 0,
    isB2B,
  }

  // ── Active plan ──────────────────────────────────────────────────────
  if (activePlanData) {
    const currentWeek = getPlanWeekNumber(activePlanData.startDate, activePlanData.totalWeeks)

    // Today's session for nutrition intensity — use user TZ, not server TZ
    const todayDow = todayDowInTz(userTz)
    const currentWeekData = activePlanData.weeks.find(w => w.weekNumber === currentWeek)
    const todaySession = currentWeekData?.sessions.find(s => s.dayOfWeek === todayDow)
    const todayIntensity = (todaySession?.intensity as 'HIGH' | 'MODERATE' | 'LOW' | null) ?? (todaySession?.type ? getSessionIntensity(todaySession.type) : null)

    if (nutritionPlanData) {
      const nt = getDailyNutritionTarget(todayIntensity, {
        targetKcalHard: nutritionPlanData.targetKcalHard,
        targetKcalEasy: nutritionPlanData.targetKcalEasy,
        targetKcalRest: nutritionPlanData.targetKcalRest,
        proteinG: nutritionPlanData.proteinG,
        carbsHardG: nutritionPlanData.carbsHardG,
        carbsEasyG: nutritionPlanData.carbsEasyG,
        fatG: nutritionPlanData.fatG,
      })
      shared.nutritionTarget = { kcal: nt.kcal, proteinG: nt.proteinG, carbsG: nt.carbsG, fatG: nt.fatG, label: nt.label }
    }

    return {
      state: 'active',
      plan: {
        name: activePlanData.name,
        currentWeek,
        totalWeeks: activePlanData.totalWeeks,
        startDate: activePlanData.startDate.toISOString().split('T')[0],
      },
      weeks: activePlanData.weeks.map(w => ({
        weekNumber: w.weekNumber,
        phase: w.phase,
        volumeKm: w.volumeKm ?? 0,
        isRecoveryWeek: w.isRecoveryWeek,
        hasTest: w.sessions.some(s => s.type === 'TEST' || s.type === 'SIMULACRO'),
        focusDescription: w.focusDescription ?? '',
        sessions: w.sessions.map(s => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          day: DAY_LABELS[s.dayOfWeek] ?? String(s.dayOfWeek),
          type: s.type,
          label: s.detailText?.slice(0, 40) ?? s.type,
          done: !!s.log,
          durationMin: s.durationMin,
          zoneTarget: s.zoneTarget ?? '',
          detailText: s.detailText ?? '',
          structure: s.structure ?? null,
          intensity: (s.intensity as string) ?? null,
          logId: s.log?.id ?? null,
          logDurationMin: s.log?.durationMin ?? null,
          logRpe: s.log?.rpe ?? null,
          logHrAvg: s.log?.hrAvg ?? null,
          logNotes: s.log?.notes ?? null,
          logDistanceKm: s.log?.distanceKm ?? null,
          coachNote: s.coachNote ?? null,
        })),
      })),
      completedPlan: null,
      ...shared,
    }
  }

  // ── Completed plan ───────────────────────────────────────────────────
  const completedSource = expiredSnapshot ?? await prisma.trainingPlan.findFirst({
    where: { userId, status: 'COMPLETED' },
    orderBy: { endDate: 'desc' },
    select: {
      endDate: true, name: true, totalWeeks: true,
      weeks: {
        orderBy: { weekNumber: 'asc' },
        select: {
          weekNumber: true, phase: true,
          sessions: {
            orderBy: { dayOfWeek: 'asc' },
            select: {
              dayOfWeek: true, type: true, detailText: true,
              durationMin: true, zoneTarget: true,
              log: { select: { id: true } },
            },
          },
        },
      },
    },
  }).catch(() => null)

  if (completedSource) {
    const allSessions = completedSource.weeks.flatMap(w => w.sessions)
    const sessionsLogged = allSessions.filter(s => s.log).length
    const recoveryDaysSinceEnd = Math.max(0, Math.floor(
      (Date.now() - new Date(completedSource.endDate).getTime()) / 86_400_000,
    ))
    const completedAdherencePct = allSessions.length > 0
      ? Math.round((sessionsLogged / allSessions.length) * 100)
      : 0
    const lastWeek = completedSource.weeks[completedSource.weeks.length - 1]
    const lastWeekSessions = (lastWeek?.sessions ?? []).map(s => ({
      dayOfWeek: s.dayOfWeek,
      type: s.type,
      label: s.detailText?.slice(0, 25) ?? s.type,
      durationMin: s.durationMin,
      zone: s.zoneTarget ?? '',
      done: !!s.log,
    }))
    const phases = [...new Set(completedSource.weeks.map(w => w.phase).filter(Boolean) as string[])]

    return {
      state: 'completed' as const,
      plan: null,
      weeks: [],
      completedPlan: {
        name: completedSource.name,
        totalWeeks: completedSource.totalWeeks,
        endDate: new Date(completedSource.endDate).toISOString().split('T')[0],
        sessionsLogged,
        sessionsTotal: allSessions.length,
        recoveryDaysSinceEnd,
        completedAdherencePct,
        lastWeekSessions,
        phases,
      },
      ...shared,
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────
  return {
    state: 'empty',
    plan: null,
    weeks: [],
    completedPlan: null,
    ...shared,
  }
}
