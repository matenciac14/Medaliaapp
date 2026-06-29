/**
 * Pure helpers shared by plan-generation flows (coach plan builder, /new-goal).
 * Not used by the simplified onboarding wizard.
 * No I/O, no Prisma, no Next.js.
 */

/** Converts "MM:SS" or "HH:MM:SS" time strings to total seconds. */
export function timeStringToSecs(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

/** Maps a goalType string to sport config fields used when completing onboarding after plan generation. */
export function resolveSportConfig(goalType: string): {
  sportType: 'RUNNING' | 'STRENGTH' | 'GENERAL'
  sportGoal: 'RACE' | 'BODY_RECOMPOSITION' | 'GENERAL_FITNESS'
} {
  const upper = goalType.toUpperCase()
  if (upper === 'STRENGTH_TRAINING') return { sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' }
  if (upper.startsWith('RACE_'))     return { sportType: 'RUNNING',  sportGoal: 'RACE' }
  if (upper === 'BODY_RECOMPOSITION' || upper === 'WEIGHT_LOSS') {
    return { sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' }
  }
  return { sportType: 'GENERAL', sportGoal: 'GENERAL_FITNESS' }
}
