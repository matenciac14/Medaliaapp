/**
 * Athlete data loader — centralized queries for all athlete pages.
 *
 * Each "slice" is a single canonical query that multiple pages need.
 * Pages call loadAthleteData(userId, [...slices]) and get only the
 * data they asked for, fetched in parallel via Promise.all.
 *
 * Benefits:
 * - One definition per query (no copy-paste across pages)
 * - Consistent selects — every page sees the same fields
 * - Fix a bug once, fixed everywhere
 */

import { prisma } from '@/lib/db/prisma'
import { queryPendingSuggestions, queryTodayFoodLogs } from './shared_athlete_data'

// ── Slice query functions ──────────────────────────────────────────────────

const sliceQueries = {
  /** User basics: name, email, timezone, image */
  user: (userId: string) =>
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        image: true,
      },
    }),

  /** Health profile — superset select covering all pages */
  healthProfile: (userId: string) =>
    prisma.healthProfile.findUnique({
      where: { userId },
      select: {
        weightKg: true,
        heightCm: true,
        age: true,
        dateOfBirth: true,
        gender: true,
        weightGoalKg: true,
        sport: true,
        sportGoal: true,
        experienceLevel: true,
        hrMax: true,
        hrResting: true,
        sleepHoursAvg: true,
        sportDetails: true,
        injuries: true,
        conditions: true,
      },
    }),

  /** Lightweight active plan metadata (no weeks/sessions) */
  activePlanMeta: (userId: string) =>
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        totalWeeks: true,
      },
    }),

  /** Full nutrition plan record */
  nutritionPlan: (userId: string) =>
    prisma.nutritionPlan.findUnique({ where: { userId } }),

  /** Coach-athlete relation with coach info */
  coachRelation: (userId: string) =>
    prisma.coachAthlete.findFirst({
      where: { athleteId: userId, status: 'ACTIVE' },
      select: {
        id: true,
        coach: {
          select: {
            id: true,
            name: true,
            coachProfile: {
              select: { slug: true, specialties: true, headline: true },
            },
          },
        },
      },
    }),

  /** Last 12 check-ins — superset select covering all pages */
  checkIns: (userId: string) =>
    prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' as const },
      take: 12,
      select: {
        weekNumber: true,
        recordedAt: true,
        weightKg: true,
        hrResting: true,
        energyLevel: true,
        sleepHours: true,
        sleepScore: true,
        stressLevel: true,
        motivationLevel: true,
        hardestSessionRpe: true,
        adjustmentsTriggered: true,
        painLevel: true,
        nutritionAdherencePct: true,
        waistCm: true,
        hipsCm: true,
        armsCm: true,
        thighsCm: true,
      },
    }),

  /** Oldest check-in with weight — for weight progress calculation */
  oldestWeightCheckIn: (userId: string) =>
    prisma.weeklyCheckIn.findFirst({
      where: { userId, weightKg: { not: null } },
      orderBy: { recordedAt: 'asc' },
      select: { weightKg: true },
    }),

  /** Today's food logs with macros — needs timezone for correct "today" */
  todayFood: (userId: string, timezone?: string | null) => queryTodayFoodLogs(userId, timezone),

  /** Count of pending (non-expired) suggestions */
  pendingSuggestions: (userId: string) => queryPendingSuggestions(userId),
} as const

// ── Types ────────────────────────────────────────────────────────────────

type SliceQueries = typeof sliceQueries
export type SliceName = keyof SliceQueries
export type SliceResults = {
  [K in SliceName]: Awaited<ReturnType<SliceQueries[K]>>
}

export type UserSlice = SliceResults['user']
export type HealthProfileSlice = SliceResults['healthProfile']
export type ActivePlanMetaSlice = SliceResults['activePlanMeta']
export type NutritionPlanSlice = SliceResults['nutritionPlan']
export type CoachRelationSlice = SliceResults['coachRelation']
export type CheckInsSlice = SliceResults['checkIns']

// ── Loader ───────────────────────────────────────────────────────────────

export type LoaderOpts = { timezone?: string | null }

/**
 * Load athlete data slices in parallel.
 *
 * ```ts
 * const { healthProfile, coachRelation } = await loadAthleteData(userId, [
 *   'healthProfile', 'coachRelation',
 * ], { timezone: user.timezone })
 * ```
 */
export async function loadAthleteData<S extends SliceName>(
  userId: string,
  slices: readonly S[],
  opts?: LoaderOpts,
): Promise<Pick<SliceResults, S>> {
  const entries = slices.map(s => {
    const fn = sliceQueries[s]
    const promise = s === 'todayFood'
      ? (fn as typeof sliceQueries.todayFood)(userId, opts?.timezone)
      : (fn as (id: string) => Promise<unknown>)(userId)
    return [s, promise] as const
  })
  const resolved = await Promise.all(
    entries.map(async ([key, promise]) => [key, await promise] as const),
  )
  return Object.fromEntries(resolved) as Pick<SliceResults, S>
}
