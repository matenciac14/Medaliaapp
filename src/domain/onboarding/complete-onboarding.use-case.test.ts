import { describe, it, expect, vi, beforeEach } from 'vitest'
import { completeOnboardingUseCase } from './complete-onboarding.use-case'
import type { WizardData } from './onboarding.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWizardData(overrides: Partial<WizardData> = {}): WizardData {
  return {
    activityType: 'RUNNING',
    gymGoal: null,
    runningGoal: 'RACE_5K',
    age: 30,
    heightCm: 175,
    weightKg: 75,
    gender: 'male',
    weightGoalKg: null,
    daysPerWeek: 4,
    sessionMinutes: 60,
    experienceLevel: 'INTERMEDIATE',
    injuries: '',
    conditions: '',
    ...overrides,
  }
}

function makeDeps(isB2B = false) {
  const mockTx = {
    weeklyRoutine: { upsert: vi.fn().mockResolvedValue({}) },
  }

  const db = {
    coachAthlete: { findFirst: vi.fn().mockResolvedValue(isB2B ? { id: 'rel-1' } : null) },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  }

  const healthProfileRepo = { upsertProfile: vi.fn().mockResolvedValue(undefined) }
  const userRepo = { completeOnboarding: vi.fn().mockResolvedValue(undefined) }
  const planRepo = { upsertNutrition: vi.fn().mockResolvedValue(undefined) }

  const txRepoFactory = () => ({
    healthProfileRepo,
    userRepo,
    planRepo,
  })

  return { db, healthProfileRepo, userRepo, planRepo, txRepoFactory, mockTx }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('completeOnboardingUseCase', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('atleta B2C (autónomo)', () => {
    it('retorna isB2B: false y planId: null', async () => {
      const deps = makeDeps(false)
      const result = await completeOnboardingUseCase(makeWizardData(), 'user-1', deps as any)

      expect(result).toEqual({ isB2B: false, planId: null })
    })

    it('activa todas las features del atleta B2C', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(makeWizardData(), 'user-1', deps as any)

      expect(deps.userRepo.completeOnboarding).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          features: { plan: true, nutrition: true, progress: true, log: true, checkin: true, gym: true },
          onboarding: expect.objectContaining({ completed: true }),
        })
      )
    })

    it('crea WeeklyRoutine con daysPerWeek', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(makeWizardData({ daysPerWeek: 5 }), 'user-1', deps as any)

      expect(deps.mockTx.weeklyRoutine.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          update: { daysPerWeek: 5 },
          create: expect.objectContaining({ userId: 'user-1', daysPerWeek: 5 }),
        })
      )
    })

    it('guarda nutrición (upsertNutrition) con TDEE calculado', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(makeWizardData(), 'user-1', deps as any)

      expect(deps.planRepo.upsertNutrition).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          tdee: expect.any(Number),
          proteinG: expect.any(Number),
        })
      )
      // TDEE debe ser positivo
      const call = deps.planRepo.upsertNutrition.mock.calls[0][1]
      expect(call.tdee).toBeGreaterThan(0)
    })
  })

  describe('atleta B2B (con coach)', () => {
    it('retorna isB2B: true y planId: null', async () => {
      const deps = makeDeps(true)
      const result = await completeOnboardingUseCase(makeWizardData(), 'user-2', deps as any)

      expect(result).toEqual({ isB2B: true, planId: null })
    })

    it('NO activa features — el coach las activa después', async () => {
      const deps = makeDeps(true)
      await completeOnboardingUseCase(makeWizardData(), 'user-2', deps as any)

      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.features).toBeUndefined()
    })

    it('NO crea WeeklyRoutine', async () => {
      const deps = makeDeps(true)
      await completeOnboardingUseCase(makeWizardData(), 'user-2', deps as any)

      expect(deps.mockTx.weeklyRoutine.upsert).not.toHaveBeenCalled()
    })
  })

  describe('activityToSport mapping', () => {
    it('GYM → sport STRENGTH', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(
        makeWizardData({ activityType: 'GYM', gymGoal: 'MUSCLE_GAIN', runningGoal: null }),
        'user-1', deps as any
      )
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.type).toBe('STRENGTH')
    })

    it('RUNNING → sport RUNNING', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(makeWizardData({ activityType: 'RUNNING' }), 'user-1', deps as any)
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.type).toBe('RUNNING')
    })

    it('BOTH → sport RUNNING (running es deporte primario)', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(
        makeWizardData({ activityType: 'BOTH', gymGoal: 'MUSCLE_GAIN' }),
        'user-1', deps as any
      )
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.type).toBe('RUNNING')
    })
  })

  describe('sportGoal mapping', () => {
    it('GYM + MUSCLE_GAIN → STRENGTH_TRAINING', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(
        makeWizardData({ activityType: 'GYM', gymGoal: 'MUSCLE_GAIN', runningGoal: null }),
        'user-1', deps as any
      )
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.goal).toBe('STRENGTH_TRAINING')
    })

    it('GYM + FAT_LOSS → BODY_RECOMPOSITION', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(
        makeWizardData({ activityType: 'GYM', gymGoal: 'FAT_LOSS', runningGoal: null }),
        'user-1', deps as any
      )
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.goal).toBe('BODY_RECOMPOSITION')
    })

    it('RUNNING + RACE_5K → RACE_5K', async () => {
      const deps = makeDeps(false)
      await completeOnboardingUseCase(
        makeWizardData({ activityType: 'RUNNING', runningGoal: 'RACE_5K' }),
        'user-1', deps as any
      )
      const callArg = deps.userRepo.completeOnboarding.mock.calls[0][1]
      expect(callArg.sport.goal).toBe('RACE_5K')
    })
  })
})
