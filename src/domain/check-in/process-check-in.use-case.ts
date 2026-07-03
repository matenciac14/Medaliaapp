/**
 * Use Case: Process Weekly Check-In
 *
 * Single source of business logic — shared by web and mobile routes.
 * Routes handle ONLY auth + input normalization, then delegate here.
 *
 * Two phases:
 *
 *  PHASE 1 — Reads (parallel, outside transaction)
 *    Load previous check-in, active plan, training adherence
 *
 *  PHASE 2 — Pure computation (outside transaction)
 *    Evaluate rules deterministically
 *    Build recommendation from adjustments (no AI)
 *
 *  PHASE 3 — All DB writes in ONE atomic $transaction (timeout 30s)
 *    Upsert WeeklyCheckIn
 *    Apply session adjustments to next week
 *    Sync weight → HealthProfile + recalculate TDEE/macros
 *    Activate progress feature on first check-in
 */
import type { ICheckInRepository } from '@/domain/ports/checkin.repository'
import type { IPlanRepository } from '@/domain/ports/plan.repository'
import type { IHealthProfileRepository } from '@/domain/ports/health-profile.repository'
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { PrismaDbClient } from '@/lib/db/prisma-client'
import type { CheckInInput, PlanContext } from './check-in.types'
import { CHECK_IN_THRESHOLDS } from './check-in.types'
import { evaluateCheckInRules, buildSessionAdjustments } from './evaluate-rules'
import { getPlanWeekNumber, getCurrentISOWeek } from '@/lib/core/week-number'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'
import { calcAge } from '@/lib/utils/calc-age'
import { PrismaCheckInRepository } from '@/infrastructure/db/check-in.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'

export type ProcessCheckInInput = {
  userId: string
  data: CheckInInput
}

export type ProcessCheckInResult = {
  weekNumber: number
  triggers: string[]
  adjustments: string[]
  recommendation: string
  severity: 'ok' | 'warning' | 'critical'
  sessionsAdjusted: number
}

/** Full Prisma client (not transaction client) — needed to open $transaction. */
type PrismaFullClient = PrismaDbClient & {
  $transaction<R>(fn: (tx: PrismaDbClient) => Promise<R>, options?: { timeout?: number }): Promise<R>
}

const RECOMMENDATION_FALLBACK =
  '¡Excelente semana! Tus métricas están en rango óptimo. Mantén el ritmo y sigue el plan como está.'

export async function processCheckIn(
  input: ProcessCheckInInput,
  deps: {
    db: PrismaFullClient
    checkInRepo: ICheckInRepository
    planRepo: IPlanRepository
    healthProfileRepo: IHealthProfileRepository
    userRepo: IUserRepository
  }
): Promise<ProcessCheckInResult> {
  const { userId, data } = input

  // ─────────────────────────────────────────────────────────
  // PHASE 1 — Reads (parallel, no side effects, outside tx)
  // ─────────────────────────────────────────────────────────
  const [prevCheckIn, activePlan] = await Promise.all([
    deps.checkInRepo.findLatest(userId),
    deps.planRepo.findActive(userId),
  ])

  const weekNumber = activePlan
    ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    : getCurrentISOWeek()

  const trainingAdherence = activePlan
    ? await deps.planRepo.getTrainingAdherence(activePlan.id, activePlan.currentWeek)
    : 0

  // ─────────────────────────────────────────────────────────
  // PHASE 2 — Pure evaluation (deterministic, no external I/O)
  // ─────────────────────────────────────────────────────────
  const planContext: PlanContext = {
    planId: activePlan?.id ?? '',
    currentWeek: activePlan?.currentWeek ?? 1,
    totalWeeks: activePlan?.totalWeeks ?? 18,
    phase: activePlan?.phase ?? 'BASE',
    weekNumber,
    hrRestingBaseline: prevCheckIn?.heartRate ?? undefined,
    previousWeight: prevCheckIn?.weight ?? undefined,
  }

  const { triggers, adjustments, severity } = evaluateCheckInRules(data, planContext)

  const recommendation = triggers.length > 0
    ? adjustments.join('. ')
    : RECOMMENDATION_FALLBACK

  // ─────────────────────────────────────────────────────────
  // PHASE 3 — All DB writes in ONE atomic $transaction
  // If any step fails, the entire check-in is rolled back.
  // ─────────────────────────────────────────────────────────
  let sessionsAdjusted = 0

  await deps.db.$transaction(async (tx) => {
    const txCheckIn = new PrismaCheckInRepository(tx)
    const txPlan = new PrismaPlanRepository(tx)
    const txHealthProfile = new PrismaHealthProfileRepository(tx)
    const txUser = new PrismaUserRepository(tx)

    // 1. Persist check-in
    await txCheckIn.save(userId, {
      ...data,
      trainingAdherence,
      triggers,
      weekNumber,
      planId: activePlan?.id ?? null,
    })

    // 2. Apply session adjustments to next week (if triggers fired)
    if (activePlan && triggers.length > 0) {
      const nextWeek = activePlan.currentWeek + 1
      if (nextWeek <= activePlan.totalWeeks) {
        sessionsAdjusted = await applySessionAdjustments(
          activePlan.id,
          nextWeek,
          triggers,
          txPlan
        )
      }
    }

    // 3. Sync weight → HealthProfile + recalculate TDEE/macros
    if (data.weight) {
      await syncWeight(userId, data.weight, prevCheckIn?.weight ?? null, txHealthProfile)
    }

    // 3b. Sync FC reposo → HealthProfile (always update when provided)
    if (data.heartRate && data.heartRate > 0) {
      await txHealthProfile.updateHrResting(userId, data.heartRate)
    }

    // 4. First check-in → enable progress feature
    const total = await txCheckIn.count(userId)
    if (total === 1) {
      await txUser.enableFeature(userId, 'progress')
    }
  }, { timeout: 30_000 })

  return { weekNumber, triggers, adjustments, recommendation, severity, sessionsAdjusted }
}

// ─────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────

async function applySessionAdjustments(
  planId: string,
  nextWeekNumber: number,
  triggers: string[],
  planRepo: IPlanRepository
): Promise<number> {
  const sessions = await planRepo.findWeekSessions(planId, nextWeekNumber)
  if (sessions.length === 0) return 0

  const { hasPain, hasVolumeTrigger, hasRpe, volumeReduction } = buildSessionAdjustments(triggers)
  const HIGH_INTENSITY_TYPES = ['INTERVALOS', 'TIRADA_LARGA', 'FARTLEK', 'SIMULACRO', 'TEST']
  let count = 0

  for (const session of sessions) {
    // Skip sessions manually edited by the coach (coachNotes present but not [AUTO]-generated)
    if (session.coachNotes && !session.coachNotes.includes('[AUTO]')) continue

    const updates: Record<string, unknown> = {}
    const notes: string[] = []

    if (hasPain && HIGH_INTENSITY_TYPES.includes(session.type)) {
      updates.type = 'RODAJE_Z2'
      updates.intensity = 'LOW'
      updates.durationMin = Math.min(session.durationMin, 40)
      notes.push('Sesión convertida a recuperación activa por dolor reportado. Consulta médica recomendada.')
    } else if (hasPain) {
      notes.push('Dolor activo — sesión opcional. No forzar si hay molestia.')
    }

    if (hasVolumeTrigger && !hasPain) {
      updates.durationMin = Math.round(session.durationMin * volumeReduction)
      const label = triggers.includes('estres_alto') ? 'estrés elevado' : 'señales de fatiga'
      notes.push(`Volumen reducido ${Math.round((1 - volumeReduction) * 100)}% por ${label}.`)
    }

    if (hasRpe && session.zone && !hasPain) {
      const zoneMap: Record<string, string> = { Z5: 'Z4', Z4: 'Z3', Z3: 'Z2', Z2: 'Z1', Z1: 'Z1' }
      const lowerZone = zoneMap[session.zone]
      if (lowerZone && lowerZone !== session.zone) {
        updates.zone = lowerZone
        notes.push(`Zona bajada de ${session.zone} a ${lowerZone} por RPE elevado.`)
      }
    }

    if (notes.length > 0) {
      const base = session.coachNotes ? session.coachNotes + ' ' : ''
      updates.coachNotes = base + '[AUTO] ' + notes.join(' ')
    }

    if (Object.keys(updates).length > 0) {
      await planRepo.updateSession(session.id, updates)
      count++
    }
  }

  return count
}

async function syncWeight(
  userId: string,
  newWeight: number,
  previousWeight: number | null,
  healthProfileRepo: IHealthProfileRepository
): Promise<void> {
  const profile = await healthProfileRepo.find(userId)
  const runtimeAge = profile?.dateOfBirth ? calcAge(profile.dateOfBirth) : (profile?.age ?? null)
  if (!profile?.heightCm || !runtimeAge) return

  // BUG-055: comparar siempre vs el peso base del perfil, no vs el check-in anterior
  // Evita que ajustes de 0.3kg entre check-ins nunca actualicen el perfil base
  const prev = profile.weightKg ?? newWeight
  if (Math.abs(newWeight - prev) < CHECK_IN_THRESHOLDS.WEIGHT_DELTA_MIN) return

  await healthProfileRepo.updateWeight(userId, newWeight)

  const hasNutritionPlan = await healthProfileRepo.hasNutritionPlan(userId)
  if (!hasNutritionPlan) return

  const tdee = calculateTDEE(
    newWeight,
    profile.heightCm,
    runtimeAge,
    (profile.gender ?? 'male') as 'male' | 'female',
    5
  )
  const macros = calculateMacros(tdee, newWeight, !!profile.weightGoalKg)

  await healthProfileRepo.updateNutritionTargets(userId, {
    tdee,
    targetKcalHard: macros.hard.kcal,
    targetKcalEasy: macros.easy.kcal,
    targetKcalRest: macros.rest.kcal,
    proteinG: macros.hard.protein,
    carbsHardG: macros.hard.carbs,
    carbsEasyG: macros.easy.carbs,
    fatG: macros.hard.fat,
  })
}
