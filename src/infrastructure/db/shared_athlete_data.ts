/**
 * Shared athlete data — queries and computations used by both Dashboard and Plan pages.
 *
 * Single source of truth for:
 * - Plan lifecycle (dedup + expiration detection)
 * - Pending suggestions query (with expiresAt filter)
 * - Today's food logs query
 * - Weight data computation
 * - Check-in data extraction
 * - Race days computation
 * - Shared types
 */

import { prisma } from '@/lib/db/prisma'
import { PlanStatus } from '@/generated/prisma/enums'
import { selectActivePlan } from '@/domain/plan/active_plan'
import { todayInTz } from '@/lib/core/date_utils'

// ── Shared Types ────────────────────────────────────────────────────────────

export type WeightData = {
  currentKg: number | null
  goalKg: number | null
  progressPct: number | null
  weeklyChange: number | null
}

export type FoodTotals = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type NutritionTarget = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  label: string
}

export type CheckInData = {
  energyLevel: number | null
  sleepHours: number | null
  stressLevel: number | null
  motivationLevel: number | null
  recordedAt: string
}

export type BodyMeasures = {
  waistCm: number | null
  hipsCm: number | null
  armsCm: number | null
  thighsCm: number | null
}

export type HRZones = {
  z1: { min: number; max: number }
  z2: { min: number; max: number }
  z3: { min: number; max: number }
  z4: { min: number; max: number }
  z5: { min: number; max: number }
}

// ── Shared Queries ──────────────────────────────────────────────────────────

/** Count pending suggestions — always filters expired ones */
export function queryPendingSuggestions(userId: string) {
  return prisma.checkInSuggestion.count({
    where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
  })
}

/** Today's food logs with macro data — identical select used by Dashboard and Plan */
export function queryTodayFoodLogs(userId: string, timezone?: string | null) {
  const todayStart = todayInTz(timezone)
  return prisma.foodLog.findMany({
    where: { userId, date: todayStart },
    select: {
      grams: true,
      mealType: true,
      kcalLogged: true,
      proteinLogged: true,
      carbsLogged: true,
      fatLogged: true,
      food: { select: { kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } },
    },
  })
}

// ── Plan Lifecycle ──────────────────────────────────────────────────────────

type PlanForLifecycle = {
  id: string
  startDate: Date
  endDate: Date
  totalWeeks: number
  weeks: Array<{ sessions: Array<{ log: unknown }> }>
}

/**
 * Resolves active plan from a list: dedup (mark losers as COMPLETED) + detect expiration.
 *
 * Returns:
 * - activePlan: the winning plan (null if expired or none)
 * - expiredSnapshot: the plan data before it was marked expired (for building completed state in-memory)
 *
 * Side effects: fire-and-forget Prisma updates for dedup and expiration.
 */
export function handlePlanLifecycle<T extends PlanForLifecycle>(
  activePlans: T[],
): { activePlan: T | null; expiredSnapshot: T | null } {
  const { winner, loserIds } = selectActivePlan(activePlans)

  if (loserIds.length > 0) {
    prisma.trainingPlan.updateMany({
      where: { id: { in: loserIds } },
      data: { status: PlanStatus.COMPLETED },
    }).catch(e => console.error('[plan-lifecycle] dedup failed:', e))
  }

  if (winner) {
    const now = new Date()
    const rawWeek = Math.floor((now.getTime() - new Date(winner.startDate).getTime()) / 86400000 / 7) + 1
    if (rawWeek > winner.totalWeeks && now > new Date(winner.endDate)) {
      prisma.trainingPlan.update({
        where: { id: winner.id },
        data: { status: PlanStatus.COMPLETED },
      }).catch(e => console.error('[plan-lifecycle] expire failed:', e))
      return { activePlan: null, expiredSnapshot: winner }
    }
  }

  return { activePlan: winner ?? null, expiredSnapshot: null }
}

// ── Shared Computations ─────────────────────────────────────────────────────

type CheckInRow = {
  recordedAt: Date
  weightKg: number | null
  energyLevel: number | null
  sleepHours: number | null
  stressLevel?: number | null
  motivationLevel?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  armsCm?: number | null
  thighsCm?: number | null
}

/** Weight progress: current vs goal, weekly change between last 2 check-ins */
export function computeWeightData(
  currentKg: number | null,
  goalKg: number | null,
  checkIns: CheckInRow[],
  oldestWeightKg: number | null,
): WeightData | null {
  if (!currentKg) return null

  let progressPct: number | null = null
  if (oldestWeightKg && goalKg && oldestWeightKg !== goalKg) {
    progressPct = Math.min(100, Math.max(0,
      Math.round(((oldestWeightKg - currentKg) / (oldestWeightKg - goalKg)) * 100),
    ))
  }

  let weeklyChange: number | null = null
  if (checkIns.length >= 2 && checkIns[0].weightKg && checkIns[1].weightKg) {
    const daysDiff = Math.max(1,
      (new Date(checkIns[0].recordedAt).getTime() - new Date(checkIns[1].recordedAt).getTime()) / 86400000,
    )
    weeklyChange = Math.round(((checkIns[0].weightKg - checkIns[1].weightKg) / daysDiff) * 7 * 10) / 10
  }

  return { currentKg, goalKg: goalKg ?? null, progressPct, weeklyChange }
}

/** Extract check-in data + body measures from the latest check-in */
export function extractCheckInData(
  checkIns: CheckInRow[],
): { checkInData: CheckInData | null; bodyMeasures: BodyMeasures | null } {
  if (checkIns.length === 0) return { checkInData: null, bodyMeasures: null }

  const latest = checkIns[0]
  const checkInData: CheckInData = {
    energyLevel: latest.energyLevel,
    sleepHours: latest.sleepHours,
    stressLevel: latest.stressLevel ?? null,
    motivationLevel: latest.motivationLevel ?? null,
    recordedAt: latest.recordedAt.toISOString(),
  }

  let bodyMeasures: BodyMeasures | null = null
  if (latest.waistCm || latest.hipsCm || latest.armsCm || latest.thighsCm) {
    bodyMeasures = {
      waistCm: latest.waistCm ?? null,
      hipsCm: latest.hipsCm ?? null,
      armsCm: latest.armsCm ?? null,
      thighsCm: latest.thighsCm ?? null,
    }
  }

  return { checkInData, bodyMeasures }
}

/** Days until race from sportDetails JSON */
export function computeRaceDays(sportDetails: unknown): number | null {
  const details = sportDetails as { raceDate?: string } | null
  const raceDateStr = details?.raceDate ?? null
  if (!raceDateStr) return null
  return Math.ceil((new Date(raceDateStr).getTime() - Date.now()) / 86_400_000)
}
