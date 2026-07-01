/**
 * Domain types for the Check-In bounded context.
 * Field names are semantic (domain language), not DB column names.
 * Infrastructure maps these to Prisma model fields.
 */

/** Data submitted by the athlete — both web and mobile share this after normalization. */
export type CheckInInput = {
  rpe: number                   // 1–10 perceived exertion (maps to hardestSessionRpe)
  sleepHours: number            // hours slept
  sleepScore?: number           // 1–100 optional quality score
  energyLevel: number           // 1–10
  stressLevel: number           // 1–10
  weight?: number               // kg (maps to weightKg)
  heartRate?: number            // resting bpm (maps to hrResting)
  painLevel?: number            // 1–10
  painDescription?: string
  nutritionAdherence?: number   // 1–10 (maps to nutritionAdherencePct / 10 * 100)
  motivation?: number           // 1–10 (maps to motivationLevel)
  notes?: string
  // Body measurements — purely observational, don't affect plan rules
  waistCm?: number
  armsCm?: number
  hipsCm?: number
  thighsCm?: number
}

/** Minimal data from the previous check-in used for dynamic baselines. */
export type PreviousCheckIn = {
  heartRate: number | null      // hrResting in DB
  weight: number | null         // weightKg in DB
}

export type CheckInAdjustmentLog = {
  date: string
  rule: string
  action: string
  description: string
  sessionId?: string
}

/** Thresholds used in evaluateCheckInRules — constants, not magic numbers. */
export const CHECK_IN_THRESHOLDS = {
  HIGH_RPE: 8,            // rpe >= 8 triggers load reduction
  LOW_SLEEP: 6.5,         // sleepHours < 6.5 triggers recovery
  HIGH_STRESS: 8,         // stressLevel >= 8 triggers load reduction
  HIGH_PAIN: 5,           // painLevel >= 5 activates pain flag
  WEIGHT_LOSS_WEEKLY: 1,  // kg — more than this in one week triggers alert
  LOW_ENERGY: 3,          // energyLevel <= 3 triggers recovery week
  LOW_MOTIVATION: 3,      // motivationLevel <= 3 alerts coach (no plan change)
  LOW_NUTRITION_ADH: 4,   // nutritionAdherence <= 4/10 triggers alert
  WEIGHT_DELTA_MIN: 0.5,  // minimum kg change to trigger healthProfile update
} as const

/** Plan context needed by the evaluation rules. */
export type PlanContext = {
  planId: string
  currentWeek: number
  totalWeeks: number
  phase: string
  weekNumber: number          // plan-relative week number
  hrRestingBaseline?: number  // from previous check-in
  previousWeight?: number     // from previous check-in, kg
}
