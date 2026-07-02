/**
 * Use case: generate a training plan for an athlete.
 *
 * Two-phase pattern:
 *
 * Phase 1 — reads + pure computation (OUTSIDE $transaction)
 *   Template selection, HR zones, TDEE, macros.
 *
 * Phase 2 — ALL DB writes inside a single $transaction (atomic)
 *   deactivateUserPlans → createPlan → createWeeks → createSessions → upsertNutrition
 *
 * Phase 3 — user config update (OUTSIDE $transaction)
 *   Avoids holding the connection open for a JSON read + deep-merge + write.
 */

import type { IPlanRepository, CreateWeekData } from '@/domain/ports/plan.repository'
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { NutritionTargets } from '@/domain/ports/health-profile.repository'
import type { BuiltSession } from '@/domain/plan/session-builder'
import {
  getSessionIntensity,
  sessionDate,
} from '@/domain/plan/session-builder'
import { calculateHRZones, calculateMacros, calculateTDEE, estimateHRMax } from '@/lib/plan/formulas'
import { getTemplate } from '@/lib/plan/templates'
import { resolveSportConfig } from '@/domain/onboarding/onboarding.utils'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import type { PrismaDbClient } from '@/lib/db/prisma-client'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Running goal types that include a weekly FUERZA session in their template. */
const RUNNING_GOALS = new Set([
  'RACE_5K', 'RACE_10K', 'RACE_HALF_MARATHON', 'RACE_MARATHON',
])

/**
 * Maps training phase → WorkoutDay ID for the "Fuerza corredor" system template.
 * IDs are stable — defined in prisma/seed.ts.
 *
 * BASE:       functional strength (3×12-15, sentadillas, lunges, hip thrust)
 * DESARROLLO+: specific runner strength (4×8-10, heavier load, calf emphasis)
 */
const FUERZA_CORREDOR_DAY: Record<string, string> = {
  BASE:        'system-fuerza-corredor-base',
  DESARROLLO:  'system-fuerza-corredor-especifico',
  ESPECIFICO:  'system-fuerza-corredor-especifico',
  ESPECÍFICO:  'system-fuerza-corredor-especifico',
  AFINAMIENTO: 'system-fuerza-corredor-especifico',
}

/**
 * Pure function — resolves the WorkoutDay ID that should be linked to a planned session.
 * Returns null for all non-running plans or non-FUERZA sessions.
 * Exported for testing.
 */
export function resolveWorkoutDayId(
  goalType: string,
  sessionType: string,
  phase: string,
): string | null {
  if (!RUNNING_GOALS.has(goalType) || sessionType !== 'FUERZA') return null
  return FUERZA_CORREDOR_DAY[phase] ?? null
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeneratePlanInput = {
  userId: string
  goalType: string
  raceDate?: string
  targetTimeSecs?: number
  weightGoalKg?: number
  age: number
  heightCm: number
  weightKg: number
  gender?: 'male' | 'female'
  hrResting?: number
  hrMax?: number
  daysPerWeek: number
  hoursPerSession: number
  injuries: string[]
  conditions: string[]
  nutritionCommitment: string
  generatedBy?: 'AI' | 'COACH'
  experienceLevel?: string
}

export type GeneratePlanResult = {
  planId: string
  hrZones: ReturnType<typeof calculateHRZones>
  hrMax: number
  tdee: number
}

// ── Use case ──────────────────────────────────────────────────────────────────

export async function generatePlanUseCase(
  input: GeneratePlanInput,
  deps: {
    db: PrismaDbClient
    planRepo: IPlanRepository
    userRepo: IUserRepository
  }
): Promise<GeneratePlanResult> {

  // ── Phase 1: reads + pure computation ────────────────────────────────────

  const template = getTemplate(input.goalType)
  if (!template) {
    throw new Error(`goalType sin template: ${input.goalType}`)
  }
  const hrMax = input.hrMax && input.hrMax > 100 ? input.hrMax : estimateHRMax(input.age)
  const hrZones = calculateHRZones(hrMax, input.hrResting ?? 0)
  const tdee = calculateTDEE(input.weightKg, input.heightCm, input.age, input.gender ?? 'male', input.daysPerWeek)
  const macros = calculateMacros(tdee, input.weightKg, !!input.weightGoalKg)

  const planStart = new Date()
  planStart.setHours(0, 0, 0, 0)
  const totalWeeks = template.totalWeeks
  const planEnd = new Date(planStart)
  planEnd.setDate(planEnd.getDate() + totalWeeks * 7)

  const isB2C = input.generatedBy !== 'COACH'

  // ── Phase 2: all writes inside $transaction ───────────────────────────────

  const planId = await deps.db.$transaction(async (tx) => {
    // Create a tx-scoped repo — tx satisfies PrismaDbClient (Prisma 7 keeps $transaction for nested tx)
    const repo = new PrismaPlanRepository(tx)

    await repo.deactivateUserPlans(input.userId)

    const { id } = await repo.createPlan({
      userId: input.userId,
      name: `Plan ${input.goalType} — ${planStart.toLocaleDateString('es-CO')}`,
      goalType: input.goalType,
      totalWeeks,
      startDate: planStart,
      endDate: planEnd,
      hrZones,
      generatedBy: input.generatedBy === 'COACH' ? 'COACH' : 'AI',
    })

    {
      const weekData: CreateWeekData[] = template.weeks.map(week => {
        const idx = week.weekNumber - 1
        const weekStart = new Date(planStart)
        weekStart.setDate(weekStart.getDate() + idx * 7)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return {
          planId: id,
          weekNumber: week.weekNumber,
          phase: week.phase,
          volumeKm: week.volumeKm,
          focusDescription: week.focusDescription,
          isRecoveryWeek: week.isRecoveryWeek,
          startDate: weekStart,
          endDate: weekEnd,
        }
      })

      const createdWeeks = await repo.createWeeks(weekData)

      const isRunning = RUNNING_GOALS.has(input.goalType)

      const allSessions: BuiltSession[] = template.weeks.flatMap((week, i) => {
        const planWeek = createdWeeks[i]
        const idx = week.weekNumber - 1

        return week.sessions.map(session => {
          // Link FUERZA sessions in running plans to the system WorkoutDay so the
          // gym tracker can load exercises automatically without coach assignment.
          const workoutDayId = resolveWorkoutDayId(input.goalType, session.type, week.phase)

          return {
            weekId: planWeek.id,
            dayOfWeek: session.dayOfWeek,
            type: session.type,
            intensity: getSessionIntensity(session.type),
            durationMin: session.durationMin,
            zoneTarget: session.zoneTarget,
            detailText: session.structure,
            date: sessionDate(planStart, idx, session.dayOfWeek),
            workoutDayId,
          }
        })
      })

      await repo.createSessions(allSessions)
    }

    const nutritionTargets: NutritionTargets = {
      tdee,
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
    }
    await repo.upsertNutrition(input.userId, nutritionTargets)

    return id
  }, { timeout: 30_000 })

  // ── Phase 3: update user config (outside tx) ──────────────────────────────

  const { sportType, sportGoal } = resolveSportConfig(input.goalType)

  await Promise.all([
    deps.userRepo.completeOnboarding(input.userId, {
      features: isB2C ? { plan: true, checkin: true, nutrition: true, progress: true, log: true, gym: true } : undefined,
      onboarding: { completed: true, completedAt: new Date().toISOString() },
      sport: { type: sportType, goal: sportGoal },
    }),
    // Persiste hrMax calculado (Fox) en HealthProfile — fuente canónica para todas las vistas
    deps.db.healthProfile.update({ where: { userId: input.userId }, data: { hrMax } }).catch(() => {}),
  ])

  return { planId, hrZones, hrMax, tdee }
}
