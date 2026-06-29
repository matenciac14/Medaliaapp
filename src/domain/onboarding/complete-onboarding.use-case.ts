/**
 * Use case: complete athlete onboarding.
 *
 * Routing:
 *   B2B   — profile only, no plan, no features (coach activates later)
 *   GYM   — TDEE + nutrition + WeeklyRoutine, sport=STRENGTH
 *   RUNNING / BOTH — TDEE + nutrition + WeeklyRoutine, sport=RUNNING|BOTH
 *   FREE  — TDEE + nutrition + WeeklyRoutine, no sport
 *
 * No path generates a TrainingPlan during onboarding.
 * Structured plans are created via /new-goal (B2C) or by the coach (B2B).
 */

import type { IHealthProfileRepository } from '@/domain/ports/health-profile.repository'
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { IPlanRepository } from '@/domain/ports/plan.repository'
import type { WizardData } from '@/app/onboarding/_types'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'
import type { PrismaDbClient } from '@/lib/db/prisma-client'
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

  const isB2B = await checkIsB2B(deps.db, userId)

  // ── Compute TDEE + macros (common to all paths) ───────────────────────────
  const tdee = calculateTDEE(
    data.weightKg!,
    data.heightCm!,
    data.age!,
    data.gender ?? 'male',
    data.daysPerWeek
  )
  const macros = calculateMacros(tdee, data.weightKg!, !!data.weightGoalKg)

  // ── Nutrition upsert — outside tx (idempotent) ────────────────────────────
  await deps.planRepo.upsertNutrition(userId, {
    tdee,
    targetKcalHard: macros.hard.kcal,
    targetKcalEasy: macros.easy.kcal,
    targetKcalRest: macros.rest.kcal,
    proteinG: macros.hard.protein,
    carbsHardG: macros.hard.carbs,
    carbsEasyG: macros.easy.carbs,
    fatG: macros.hard.fat,
  })

  // ── Derive sport fields from activityType ─────────────────────────────────
  const sportType = activityToSport(data.activityType)
  const sportGoal = activityToSportGoal(data.activityType, !!data.gymGoal)

  // ── Profile + onboarding completion — atomic ──────────────────────────────
  await deps.db.$transaction(async (tx) => {
    const txHealthProfile = new PrismaHealthProfileRepository(tx)
    const txUser = new PrismaUserRepository(tx)

    await txHealthProfile.upsertProfile(userId, {
      age: data.age!,
      heightCm: data.heightCm!,
      weightKg: data.weightKg!,
      weightGoalKg: data.weightGoalKg ?? undefined,
      gender: data.gender ?? 'male',
      sport: sportType,
      experienceLevel: data.experienceLevel ?? undefined,
      sportDetails: data.gymGoal ? { gymGoal: data.gymGoal } : {},
      dataSources: {},
    })

    // B2B: only save profile, coach activates features later
    if (isB2B) {
      await txUser.completeOnboarding(userId, {
        onboarding: { completed: true, completedAt: now() },
        sport: { type: sportType, goal: sportGoal },
      })
    } else {
      await txUser.completeOnboarding(userId, {
        features: { plan: true, nutrition: true, progress: true, log: true, checkin: true, gym: true },
        onboarding: { completed: true, completedAt: now() },
        sport: { type: sportType, goal: sportGoal },
      })
    }
  })

  // ── Create empty WeeklyRoutine for B2C (B2B gets it when coach activates) ─
  if (!isB2B) {
    await deps.db.weeklyRoutine.upsert({
      where: { userId },
      update: { daysPerWeek: data.daysPerWeek },
      create: { userId, daysPerWeek: data.daysPerWeek, days: [] },
    })
  }

  return { isB2B, planId: null }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString()
}

async function checkIsB2B(db: PrismaDbClient, userId: string): Promise<boolean> {
  const relation = await db.coachAthlete.findFirst({ where: { athleteId: userId } })
  return !!relation
}

function activityToSport(activityType: WizardData['activityType']): string {
  switch (activityType) {
    case 'GYM':     return 'STRENGTH'
    case 'RUNNING': return 'RUNNING'
    case 'BOTH':    return 'RUNNING'  // primary sport; gym is secondary
    default:        return 'GENERAL'
  }
}

function activityToSportGoal(activityType: WizardData['activityType'], hasGymGoal: boolean): string {
  if (activityType === 'GYM' || (activityType === 'BOTH' && hasGymGoal)) return 'BODY_RECOMPOSITION'
  if (activityType === 'RUNNING' || activityType === 'BOTH') return 'GENERAL_FITNESS'
  return 'GENERAL_FITNESS'
}
