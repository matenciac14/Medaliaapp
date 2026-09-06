/**
 * Tests for process-check-in.use-case.ts
 *
 * Strategy: mock infrastructure repo classes (they're instantiated inside $transaction).
 * db.$transaction runs the callback synchronously with a fake tx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processCheckIn } from './process_check_in.use_case'
import type { CheckInInput } from './check_in.types'

vi.mock('@/infrastructure/db/checkin.repository', () => ({
  PrismaCheckInRepository: vi.fn(),
}))
vi.mock('@/infrastructure/db/plan.repository', () => ({
  PrismaPlanRepository: vi.fn(),
}))
vi.mock('@/infrastructure/db/health_profile.repository', () => ({
  PrismaHealthProfileRepository: vi.fn(),
}))
vi.mock('@/infrastructure/db/user.repository', () => ({
  PrismaUserRepository: vi.fn(),
}))
vi.mock('@/infrastructure/db/suggestion.repository', () => ({
  PrismaSuggestionRepository: vi.fn(),
}))

import { PrismaCheckInRepository } from '@/infrastructure/db/checkin.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health_profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { PrismaSuggestionRepository } from '@/infrastructure/db/suggestion.repository'

// ── Fixtures ────────────────────────────────────────────────────────────────

const HEALTHY_INPUT: CheckInInput = {
  energyLevel: 7,
  sleepHours: 8,
  rpe: 6,
  weight: 70,
  heartRate: 55,
}

const BASE_PLAN = {
  id: 'plan-1',
  userId: 'user-1',
  goalType: 'RACE_10K',
  currentWeek: 3,
  totalWeeks: 12,
  phase: 'BASE',
  startDate: new Date('2026-01-01'),
  sessions: [],
  source: 'COACH' as const,
}



// ── Stub factories ──────────────────────────────────────────────────────────

const EMPTY_WEEK_ACTIVITY = {
  totalSessions: 0, totalMinutes: 0, avgRpe: null, maxRpe: null,
  consecutiveActiveDays: 0, avgHrReal: null, prevWeeksAvgMinutes: null,
}

function makeCheckInStub(overrides = {}) {
  return {
    findLatest: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue({ id: 'ci-1' }),
    count: vi.fn().mockResolvedValue(1),
    getWeekActivitySummary: vi.fn().mockResolvedValue(EMPTY_WEEK_ACTIVITY),
    ...overrides,
  }
}

function makePlanStub(overrides = {}) {
  return {
    findActive: vi.fn().mockResolvedValue(null),
    getTrainingAdherence: vi.fn().mockResolvedValue(0),
    findWeekSessions: vi.fn().mockResolvedValue([]),
    updateSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeHealthStub() {
  return {
    find: vi.fn().mockResolvedValue(null),
    updateWeight: vi.fn().mockResolvedValue(undefined),
    updateHrResting: vi.fn().mockResolvedValue(undefined),
    updateNutritionTargets: vi.fn().mockResolvedValue(undefined),
    hasNutritionPlan: vi.fn().mockResolvedValue(false),
    upsertProfile: vi.fn().mockResolvedValue(undefined),
  }
}

function makeUserStub() {
  return {
    enableFeature: vi.fn().mockResolvedValue(undefined),
    enableFeatures: vi.fn().mockResolvedValue(undefined),
    mergeFeatures: vi.fn().mockResolvedValue(undefined),
    completeOnboarding: vi.fn().mockResolvedValue(undefined),
  }
}

function makeSuggestionStub(overrides = {}) {
  return {
    createMany: vi.fn().mockResolvedValue(undefined),
    findPendingForUser: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    accept: vi.fn().mockResolvedValue(null),
    reject: vi.fn().mockResolvedValue(undefined),
    expireOld: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function makeDb() {
  const db: any = {
    assignedWorkout: { findFirst: vi.fn().mockResolvedValue(null) },
    weeklyCheckIn: { findMany: vi.fn().mockResolvedValue([]) },
    workoutDay: { update: vi.fn().mockResolvedValue(undefined) },
    $transaction: vi.fn(),
  }
  db.$transaction.mockImplementation(async (fn: Function) => fn(db))
  return db
}

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('processCheckIn — sin plan activo', () => {
  it('guarda el check-in y retorna result sin ajustes', async () => {
    const ciStub = makeCheckInStub()
    const planStub = makePlanStub()

    vi.mocked(PrismaCheckInRepository).mockImplementation(function() { return ciStub } as any)
    vi.mocked(PrismaPlanRepository).mockImplementation(function() { return planStub } as any)
    vi.mocked(PrismaHealthProfileRepository).mockImplementation(function() { return makeHealthStub() } as any)
    vi.mocked(PrismaUserRepository).mockImplementation(function() { return makeUserStub() } as any)
    vi.mocked(PrismaSuggestionRepository).mockImplementation(function() { return makeSuggestionStub() } as any)

    const db = makeDb()
    const result = await processCheckIn(
      { userId: 'user-1', data: HEALTHY_INPUT },
      {
        db,
        checkInRepo: { ...ciStub, findLatest: vi.fn().mockResolvedValue(null), getWeekActivitySummary: vi.fn().mockResolvedValue(EMPTY_WEEK_ACTIVITY) } as any,
        planRepo: { ...planStub } as any,
        healthProfileRepo: makeHealthStub() as any,
        userRepo: makeUserStub() as any,
      }
    )

    expect(result.sessionsAdjusted).toBe(0)
    expect(result.pendingSuggestions).toBe(0)
    expect(result.severity).toBe('ok')
    expect(ciStub.save).toHaveBeenCalledOnce()
  })
})


describe('processCheckIn — plan COACH con triggers', () => {
  it('crea sugerencias en lugar de auto-aplicar ajustes', async () => {
    const ciStub = makeCheckInStub()
    const planStub = makePlanStub()
    const suggStub = makeSuggestionStub()

    vi.mocked(PrismaCheckInRepository).mockImplementation(function() { return ciStub } as any)
    vi.mocked(PrismaPlanRepository).mockImplementation(function() { return planStub } as any)
    vi.mocked(PrismaHealthProfileRepository).mockImplementation(function() { return makeHealthStub() } as any)
    vi.mocked(PrismaUserRepository).mockImplementation(function() { return makeUserStub() } as any)
    vi.mocked(PrismaSuggestionRepository).mockImplementation(function() { return suggStub } as any)

    const db = makeDb()
    const painInput: CheckInInput = { ...HEALTHY_INPUT, painLevel: 7 } // dolor_activo

    const result = await processCheckIn(
      { userId: 'user-1', data: painInput },
      {
        db,
        checkInRepo: { findLatest: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue({ id: 'ci-1' }), count: vi.fn().mockResolvedValue(2), getWeekActivitySummary: vi.fn().mockResolvedValue(EMPTY_WEEK_ACTIVITY) } as any,
        planRepo: { findActive: vi.fn().mockResolvedValue(BASE_PLAN), getTrainingAdherence: vi.fn().mockResolvedValue(60) } as any,
        healthProfileRepo: makeHealthStub() as any,
        userRepo: makeUserStub() as any,
      }
    )

    expect(result.triggers).toContain('dolor_activo')
    expect(result.sessionsAdjusted).toBe(0) // no auto-apply
    expect(result.pendingSuggestions).toBeGreaterThan(0)
    expect(suggStub.createMany).toHaveBeenCalledOnce()
    expect(planStub.updateSession).not.toHaveBeenCalled()
  })
})

describe('processCheckIn — primer check-in activa feature progress', () => {
  it('llama enableFeature("progress") cuando count === 1', async () => {
    const ciStub = makeCheckInStub({ count: vi.fn().mockResolvedValue(1) })
    const userStub = makeUserStub()

    vi.mocked(PrismaCheckInRepository).mockImplementation(function() { return ciStub } as any)
    vi.mocked(PrismaPlanRepository).mockImplementation(function() { return makePlanStub() } as any)
    vi.mocked(PrismaHealthProfileRepository).mockImplementation(function() { return makeHealthStub() } as any)
    vi.mocked(PrismaUserRepository).mockImplementation(function() { return userStub } as any)
    vi.mocked(PrismaSuggestionRepository).mockImplementation(function() { return makeSuggestionStub() } as any)

    const db = makeDb()
    await processCheckIn(
      { userId: 'user-1', data: HEALTHY_INPUT },
      {
        db,
        checkInRepo: { findLatest: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue({ id: 'ci-1' }), count: vi.fn().mockResolvedValue(1), getWeekActivitySummary: vi.fn().mockResolvedValue(EMPTY_WEEK_ACTIVITY) } as any,
        planRepo: { findActive: vi.fn().mockResolvedValue(null), getTrainingAdherence: vi.fn().mockResolvedValue(0) } as any,
        healthProfileRepo: makeHealthStub() as any,
        userRepo: makeUserStub() as any,
      }
    )

    expect(userStub.enableFeature).toHaveBeenCalledWith('user-1', 'progress')
  })
})
