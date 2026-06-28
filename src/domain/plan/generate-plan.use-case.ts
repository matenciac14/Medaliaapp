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
import type { WizardData } from '@/app/onboarding/_types'

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
  const hrMax = input.hrMax && input.hrMax > 100 ? input.hrMax : estimateHRMax(input.age)
  const hrZones = calculateHRZones(hrMax, input.hrResting ?? 0)
  const tdee = calculateTDEE(input.weightKg, input.heightCm, input.age, input.gender ?? 'male', input.daysPerWeek)
  const macros = calculateMacros(tdee, input.weightKg, !!input.weightGoalKg)

  const planStart = new Date()
  planStart.setHours(0, 0, 0, 0)
  const totalWeeks = template?.totalWeeks ?? 18
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

    if (template) {
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

      const allSessions: BuiltSession[] = template.weeks.flatMap((week, i) => {
        const planWeek = createdWeeks[i]
        const idx = week.weekNumber - 1

        return week.sessions.map(session => ({
          weekId: planWeek.id,
          dayOfWeek: session.dayOfWeek,
          type: session.type,
          intensity: getSessionIntensity(session.type),
          durationMin: session.durationMin,
          zoneTarget: session.zoneTarget,
          detailText: session.structure,
          date: sessionDate(planStart, idx, session.dayOfWeek),
        }))
      })

      await repo.createSessions(allSessions)
    } else {
      console.warn(`[generatePlanUseCase] No template for goalType: ${input.goalType}`)
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

  const { sportType, sportGoal } = resolveSportConfig(input.goalType, {} as unknown as WizardData)

  await deps.userRepo.completeOnboarding(input.userId, {
    features: isB2C ? { plan: true, checkin: true, nutrition: true, progress: true, log: true, gym: true } : undefined,
    onboarding: { completed: true, completedAt: new Date().toISOString() },
    sport: { type: sportType, goal: sportGoal },
  })

  return { planId, hrZones, hrMax, tdee }
}
