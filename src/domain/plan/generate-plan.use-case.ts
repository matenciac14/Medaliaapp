/**
 * Use case: generate a training plan for an athlete.
 *
 * Three-phase pattern (critical for correctness):
 *
 * Phase 1 — reads + pure computation (OUTSIDE $transaction)
 *   Template selection, HR zones, TDEE, macros.
 *
 * Phase 2 — AI recommendations (MUST be OUTSIDE $transaction)
 *   External I/O inside $transaction would cause the entire tx to timeout and roll back.
 *
 * Phase 3 — ALL DB writes inside a single $transaction (atomic)
 *   deactivateUserPlans → createPlan → createWeeks → createSessions → upsertNutrition
 *
 * Phase 4 — user config update (OUTSIDE $transaction)
 *   Avoids holding the connection open for a JSON read + deep-merge + write.
 */

import type { IPlanRepository, CreateWeekData } from '@/domain/ports/plan.repository'
import type { IAIService } from '@/domain/ports/ai.service'
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { NutritionTargets } from '@/domain/ports/health-profile.repository'
import type { BuiltSession } from '@/domain/plan/session-builder'
import {
  getSessionIntensity,
  sessionDate,
} from '@/domain/plan/session-builder'
import { calculateHRZones, calculateMacros, calculateTDEE, estimateHRMax } from '@/lib/plan/formulas'
import { getTemplate } from '@/lib/plan/templates'
import { buildPlanSystemPrompt, parseAIProfile } from '@/lib/ai/profile'
import { getCachedSystemConfig } from '@/lib/db/system-config'
import { parseUserConfig } from '@/lib/config/user-config'
import { resolveSportConfig } from '@/domain/onboarding/onboarding.utils'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import type { PrismaClient } from '../../generated/prisma/client'

// TODO: cambiar a true cuando estemos listos para activar recomendaciones AI en onboarding
const AI_ONBOARDING_ENABLED = false

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
  recommendations: { title: string; text: string }[]
  hrZones: ReturnType<typeof calculateHRZones>
  hrMax: number
  tdee: number
}

// ── Use case ──────────────────────────────────────────────────────────────────

export async function generatePlanUseCase(
  input: GeneratePlanInput,
  deps: {
    db: PrismaClient
    planRepo: IPlanRepository
    aiService: IAIService
    userRepo: IUserRepository
  }
): Promise<GeneratePlanResult> {

  // ── Phase 1: reads + pure computation ────────────────────────────────────

  const template = getTemplate(input.goalType)
  const hrMax = input.hrMax && input.hrMax > 100 ? input.hrMax : estimateHRMax(input.age)
  const hrZones = calculateHRZones(hrMax, input.hrResting ?? 0)
  const tdee = calculateTDEE(input.weightKg, input.heightCm, input.age, input.gender ?? 'male', input.daysPerWeek)
  const macros = calculateMacros(tdee, input.weightKg, !!input.weightGoalKg)

  // No gym exercise fetch needed: template plans use their own session structure.

  const planStart = new Date()
  planStart.setHours(0, 0, 0, 0)
  const totalWeeks = template?.totalWeeks ?? 18
  const planEnd = new Date(planStart)
  planEnd.setDate(planEnd.getDate() + totalWeeks * 7)

  // ── Phase 2: AI recommendations (OUTSIDE $transaction) ───────────────────

  const isB2C = input.generatedBy !== 'COACH'
  const recommendations = AI_ONBOARDING_ENABLED && isB2C
    ? await getAIRecommendations(deps.aiService, input, hrMax, hrZones)
    : []

  // ── Phase 3: all writes inside $transaction ───────────────────────────────

  const planId = await deps.db.$transaction(async (tx) => {
    // Create a tx-scoped repo — accepts PrismaDbClient which $transaction tx satisfies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const repo = new PrismaPlanRepository(tx as any)

    await repo.deactivateUserPlans(input.userId)

    const { id } = await repo.createPlan({
      userId: input.userId,
      // goalType is embedded in the name for later retrieval (no goalType column in TrainingPlan)
      name: `Plan ${input.goalType} — ${planStart.toLocaleDateString('es-CO')}`,
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

        // Always use template sessions for sport/body plans.
        // buildScheduledSessions is only for pure gym-schedule plans (no template).
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
      // No template found — still upsert nutrition so the athlete gets macros
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

  // ── Phase 4: update user config (outside tx) ──────────────────────────────

  const existingUser = await deps.db.user.findUnique({
    where: { id: input.userId },
    select: { config: true },
  })
  const currentConfig = parseUserConfig(existingUser?.config)
  // Use shared resolveSportConfig from onboarding.utils (covers all sport cases)
  const { sportType, sportGoal } = resolveSportConfig(input.goalType, {} as any)

  const newConfig = {
    ...currentConfig,
    features: {
      ...currentConfig.features,
      ...(isB2C ? { plan: true, checkin: true, nutrition: true, progress: true, log: true, gym: true } : {}),
    },
    onboarding: { completed: true, completedAt: new Date().toISOString() },
    plan: { activePlanId: planId, currentWeek: 1, totalWeeks, phase: 'BASE' as const },
    sport: { type: sportType, goal: sportGoal },
  }

  await deps.userRepo.updateConfig(input.userId, newConfig)

  return { planId, recommendations, hrZones, hrMax, tdee }
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function getAIRecommendations(
  aiService: IAIService,
  input: GeneratePlanInput,
  hrMax: number,
  hrZones: ReturnType<typeof calculateHRZones>
): Promise<{ title: string; text: string }[]> {
  try {
    const sysConfig = await getCachedSystemConfig()
    const aiProfile = parseAIProfile(sysConfig?.aiProfile)
    const systemPrompt = buildPlanSystemPrompt(aiProfile, input.goalType)
    const injuriesStr = input.injuries.length > 0 ? input.injuries.join(', ') : 'ninguna'
    const conditionsStr = input.conditions.length > 0 ? input.conditions.join(', ') : 'ninguna'
    const userMessage = `Atleta: ${input.age}a, ${input.weightKg}kg, objetivo: ${input.goalType}, lesiones: ${injuriesStr}, condiciones: ${conditionsStr}. Zonas FC: Z2=${hrZones.z2.min}-${hrZones.z2.max}bpm, Z4=${hrZones.z4.min}-${hrZones.z4.max}bpm. Genera 3 recomendaciones personalizadas. JSON: {"recommendations":[{"title":string,"text":string}]}`

    const raw = await aiService.generateRecommendation(`${systemPrompt}\n\n${userMessage}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return (parsed.recommendations as { title: string; text: string }[]) ?? []
  } catch {
    return []
  }
}
