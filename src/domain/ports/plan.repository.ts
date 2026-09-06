import type { PlannedSessionUpdate, PlannedSession } from '@/domain/plan/plan.types'
import type { BuiltSession, HRZones, GymExercise } from '@/domain/plan/session_builder'
import type { NutritionTargets } from '@/domain/ports/health_profile.repository'

export type ActivePlanContext = {
  id: string
  userId: string
  goalType: string
  currentWeek: number
  totalWeeks: number
  phase: string
  startDate: Date
  sessions: PlannedSession[]
  source: 'COACH'
}

export type CreatePlanData = {
  userId: string
  name: string
  goalType?: string
  totalWeeks: number
  startDate: Date
  endDate: Date
  hrZones: HRZones
  generatedBy: 'COACH'
}

export type CreateWeekData = {
  planId: string
  weekNumber: number
  phase: string
  volumeKm?: number
  focusDescription?: string
  isRecoveryWeek?: boolean
  startDate: Date
  endDate: Date
}

export type CreatedWeek = {
  id: string
  weekNumber: number
}

/**
 * Port — contract for training plan data access and creation.
 */
export interface IPlanRepository {
  // ── Read operations ──────────────────────────────────────────────────────

  /** Active plan with current week sessions. Returns null if none. */
  findActive(userId: string): Promise<ActivePlanContext | null>

  /** % of non-rest sessions completed in a given week (0–100). */
  getTrainingAdherence(planId: string, weekNumber: number): Promise<number>

  /** Sessions for a specific week. */
  findWeekSessions(planId: string, weekNumber: number): Promise<PlannedSession[]>

  /** Gym exercises for a given list of names (used when building scheduled sessions). */
  findExercisesByNames(names: string[]): Promise<GymExercise[]>

  // ── Write operations (must be called inside a $transaction) ───────────────

  /** Marks all ACTIVE plans for a user as COMPLETED. */
  deactivateUserPlans(userId: string): Promise<void>

  /** Creates a TrainingPlan record. Returns the created plan id and totalWeeks. */
  createPlan(data: CreatePlanData): Promise<{ id: string; totalWeeks: number }>

  /** Creates all PlanWeek records in parallel. Returns week ids in order. */
  createWeeks(weeks: CreateWeekData[]): Promise<CreatedWeek[]>

  /** Batch-inserts all PlannedSession records for the plan. */
  createSessions(sessions: BuiltSession[]): Promise<void>

  /** Upserts the NutritionPlan for a user. */
  upsertNutrition(userId: string, targets: NutritionTargets): Promise<void>

  /** Update a single planned session (for check-in adjustments). */
  updateSession(sessionId: string, data: PlannedSessionUpdate): Promise<void>
}
