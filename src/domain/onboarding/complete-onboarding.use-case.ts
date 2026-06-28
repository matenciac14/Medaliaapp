/**
 * Use case: complete athlete onboarding.
 *
 * Routes for all onboarding paths:
 *   FREE  — profile + nutrition, no training plan, no sport
 *   GYM   — profile + nutrition, no training plan, sport=GYM
 *   B2B   — profile only, no plan, no trial (coach activates later)
 *   SPORT/BODY — profile + full plan generation (delegates to generatePlanUseCase)
 *
 * Each path calls healthProfileRepo.upsertProfile + userRepo.updateConfig + optionally generatePlanUseCase.
 * Profile + config writes are wrapped in $transaction per path. Nutrition upserts stay outside tx (idempotent).
 * Plan generation (B2C SPORT/BODY) wraps its own writes atomically in generate-plan.use-case.ts.
 */

import type { IHealthProfileRepository, CreateHealthProfile } from '@/domain/ports/health-profile.repository'
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { IPlanRepository } from '@/domain/ports/plan.repository'
import type { WizardData } from '@/app/onboarding/_types'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'
import { resolveGoalType, buildSportDetails, timeStringToSecs } from '@/domain/onboarding/onboarding.utils'
import { generatePlanUseCase } from '@/domain/plan/generate-plan.use-case'
import type { PrismaDbClient } from '@/lib/db/prisma-client'
// Pragmatic exception: concrete repos needed to create tx-scoped instances inside $transaction
// (same pattern as generate-plan.use-case.ts)
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompleteOnboardingResult = {
  isB2B: boolean
  planId: string | null
}

// ── Use case ──────────────────────────────────────────────────────────────────

export async function completeOnboardingUseCase(
  data: WizardData,
  userId: string,
  deps: {
    db: PrismaDbClient
    planRepo: IPlanRepository
    healthProfileRepo: IHealthProfileRepository
    userRepo: IUserRepository
  }
): Promise<CompleteOnboardingResult> {

  // ── FREE path ─────────────────────────────────────────────────────────────
  if ((data.healthGoal as string) === 'FREE') {
    const isB2B = await checkIsB2B(deps.db, userId)

    const tdee = calculateTDEE(data.weightKg!, data.heightCm!, data.age!, data.gender ?? 'male', data.daysPerWeek)
    const macros = calculateMacros(tdee, data.weightKg!, !!data.weightGoalKg)
    const sportType = data.sport ?? 'GENERAL'
    const sportGoal = data.hasSport ? 'RACE' : 'GENERAL_FITNESS'

    // Nutrition outside tx (idempotent upsert)
    await deps.planRepo.upsertNutrition(userId, {
      tdee,
      targetKcalHard: macros.hard.kcal, targetKcalEasy: macros.easy.kcal, targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein, carbsHardG: macros.hard.carbs, carbsEasyG: macros.easy.carbs, fatG: macros.hard.fat,
    })

    // Profile + config atomic
    await deps.db.$transaction(async (tx) => {
      const txHealthProfile = new PrismaHealthProfileRepository(tx)
      const txUser = new PrismaUserRepository(tx)
      await txHealthProfile.upsertProfile(userId, {
        age: data.age!, heightCm: data.heightCm!, weightKg: data.weightKg!,
        weightGoalKg: data.weightGoalKg ?? undefined,
        gender: data.gender ?? 'male',
        sport: sportType,
        sportDetails: {},
        dataSources: {},
      })
      await txUser.completeOnboarding(userId, {
        features: isB2B ? undefined : { plan: true, nutrition: true, progress: true, log: true, checkin: true, gym: true },
        onboarding: { completed: true, completedAt: now() },
        sport: { type: sportType, goal: sportGoal },
      })
    })

    return { isB2B, planId: null }
  }

  // ── GYM path ─────────────────────────────────────────────────────────────
  if (data.mainGoal === 'GYM') {
    const isB2B = await checkIsB2B(deps.db, userId)

    const tdee = calculateTDEE(data.weightKg!, data.heightCm!, data.age!, data.gender ?? 'male', data.daysPerWeek)
    const macros = calculateMacros(tdee, data.weightKg!, !!data.weightGoalKg)

    // Nutrition outside tx (idempotent upsert)
    await deps.planRepo.upsertNutrition(userId, {
      tdee,
      targetKcalHard: macros.hard.kcal, targetKcalEasy: macros.easy.kcal, targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein, carbsHardG: macros.hard.carbs, carbsEasyG: macros.easy.carbs, fatG: macros.hard.fat,
    })

    // Profile + config atomic
    await deps.db.$transaction(async (tx) => {
      const txHealthProfile = new PrismaHealthProfileRepository(tx)
      const txUser = new PrismaUserRepository(tx)
      await txHealthProfile.upsertProfile(userId, {
        age: data.age!, heightCm: data.heightCm!, weightKg: data.weightKg!,
        weightGoalKg: data.weightGoalKg ?? undefined,
        gender: data.gender ?? 'male',
        sport: 'GYM',
        sportDetails: { gymGoal: data.gymGoal },
        dataSources: {},
      })
      await txUser.completeOnboarding(userId, {
        features: isB2B ? undefined : { plan: true, nutrition: true, progress: true, log: true, checkin: true, gym: true },
        onboarding: { completed: true, completedAt: now() },
        sport: { type: 'STRENGTH', goal: 'BODY_RECOMPOSITION' },
      })
    })

    return { isB2B, planId: null }
  }

  // ── SPORT / BODY paths ─────────────────────────────────────────────────────

  const goalType = resolveGoalType(data)
  const sportDetails = buildSportDetails(data)
  const dataSources: Record<string, unknown> = {
    hrMax: { source: data.hrSource === 'known' ? 'manual' : 'estimated', updatedAt: now() },
  }

  // ── B2B path: profile only, coach activates plan later ───────────────────
  const isB2B = await checkIsB2B(deps.db, userId)

  const profileData = {
    age: data.age!, heightCm: data.heightCm!, weightKg: data.weightKg!,
    weightGoalKg: data.weightGoalKg ?? undefined,
    gender: data.gender ?? 'male',
    hrResting: data.hrResting ?? undefined,
    hrMax: data.hrMax ?? undefined,
    injuries: data.injuries,
    conditions: data.conditions,
    sport: data.mainGoal === 'SPORT' ? (data.sport ?? undefined) : 'STRENGTH',
    experienceLevel: data.experienceLevel ?? undefined,
    sportDetails,
    dataSources,
  }

  if (isB2B) {
    const b2bSportType = data.mainGoal === 'SPORT' ? (data.sport ?? 'GENERAL') : 'GENERAL'
    const b2bGoal = data.mainGoal === 'SPORT' ? 'RACE' : data.mainGoal === 'BODY' ? 'BODY_RECOMPOSITION' : 'GENERAL_FITNESS'

    // Profile + config atomic for B2B
    await deps.db.$transaction(async (tx) => {
      const txHealthProfile = new PrismaHealthProfileRepository(tx)
      const txUser = new PrismaUserRepository(tx)
      await txHealthProfile.upsertProfile(userId, profileData)
      await txUser.completeOnboarding(userId, {
        onboarding: { completed: true, completedAt: now() },
        sport: { type: b2bSportType, goal: b2bGoal },
      })
    })

    return { isB2B: true, planId: null }
  }

  // B2C: write profile before plan generation (plan generation reads it)
  await deps.healthProfileRepo.upsertProfile(userId, profileData)

  // ── B2C plan generation ───────────────────────────────────────────────────
  const result = await generatePlanUseCase(
    {
      userId,
      goalType,
      generatedBy: 'AI',
      raceDate: data.raceDate ?? undefined,
      targetTimeSecs: timeStringToSecs(data.targetTime) ?? undefined,
      weightGoalKg: data.weightGoalKg ?? undefined,
      age: data.age!,
      heightCm: data.heightCm!,
      weightKg: data.weightKg!,
      gender: data.gender ?? 'male',
      hrResting: data.hrResting ?? undefined,
      hrMax: data.hrMax ?? undefined,
      daysPerWeek: data.daysPerWeek,
      hoursPerSession: data.hoursPerSession,
      injuries: data.injuries,
      conditions: data.conditions,
      nutritionCommitment: data.nutritionCommitment ?? 'moderate',
      experienceLevel: data.experienceLevel ?? undefined,
    },
    {
      db: deps.db,
      planRepo: deps.planRepo,
      userRepo: deps.userRepo,
    }
  )

  return { isB2B: false, planId: result.planId }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString()
}

async function checkIsB2B(db: PrismaDbClient, userId: string): Promise<boolean> {
  const relation = await db.coachAthlete.findFirst({ where: { athleteId: userId } })
  return !!relation
}
