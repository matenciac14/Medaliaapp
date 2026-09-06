/**
 * Centralized week number calculation — single source of truth.
 * Replaces duplicate getISOWeekNumber() in checkin/route.ts
 * and getCurrentWeekNumber() in mobile-auth.ts.
 */

/**
 * Returns the ISO 8601 week number for a given date.
 * Week 1 = first week containing Thursday of the year.
 */
export function getISOWeekNumber(date: Date = new Date()): number {
  const target = new Date(date.getTime())
  target.setHours(0, 0, 0, 0)
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7))
  const yearStart = new Date(target.getFullYear(), 0, 4)
  return (
    1 +
    Math.round(
      ((target.getTime() - yearStart.getTime()) / 86400000 -
        3 +
        ((yearStart.getDay() + 6) % 7)) /
        7
    )
  )
}

/**
 * Returns the current week number relative to a plan's start date.
 * Clamps to [1, totalWeeks] if totalWeeks is provided.
 * This is the function used when the athlete has an active plan.
 */
export function getPlanWeekNumber(startDate: Date, totalWeeks?: number): number {
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
  const raw = Math.max(1, Math.floor((Date.now() - startDate.getTime()) / MS_PER_WEEK) + 1)
  return totalWeeks ? Math.min(totalWeeks, raw) : raw
}

/** ISO week of the current date. */
export const getCurrentISOWeek = (): number => getISOWeekNumber(new Date())

/**
 * Calcula el índice (0-based) de la semana activa de un plan.
 * Usa getPlanWeekNumber como fuente canónica y clampea a [0, weeks.length-1].
 * Usado en PlanBuilderClient y AthleteDetailClient para abrir en la semana correcta.
 */
export function getInitialWeekIdx(
  plan: { startDate: string | Date; totalWeeks: number; weeks: unknown[] } | null
): number {
  if (!plan || plan.weeks.length === 0) return 0
  const currentWeekNumber = getPlanWeekNumber(new Date(plan.startDate as string), plan.totalWeeks)
  return Math.max(0, Math.min(currentWeekNumber - 1, plan.weeks.length - 1))
}
