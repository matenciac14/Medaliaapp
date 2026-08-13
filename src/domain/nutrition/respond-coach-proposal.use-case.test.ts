import { describe, it, expect, vi } from 'vitest'
import { respondCoachProposal, ProposalError } from './respond-coach-proposal.use-case'

const DEFAULT_PROPOSAL = {
  id: 'prop-1',
  athleteId: 'athlete-1',
  coachId: 'coach-1',
  status: 'PENDING' as const,
  deltaKcal: 200,
  deltaProtein: 10,
  deltaCarbs: 20,
  deltaFat: 5,
  message: 'Subir kcal',
  coach: { name: 'Carlos' },
  respondedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const DEFAULT_PLAN = {
  id: 'plan-1',
  userId: 'athlete-1',
  targetKcalHard: 2500,
  targetKcalEasy: 2200,
  targetKcalRest: 1800,
  proteinG: 150,
  carbsHardG: 300,
  carbsEasyG: 250,
  fatG: 70,
  source: 'SYSTEM',
}

function createMockDb(opts: {
  proposal?: typeof DEFAULT_PROPOSAL | null
  plan?: typeof DEFAULT_PLAN | null
} = {}) {
  const proposalFindResult = opts.proposal === undefined ? DEFAULT_PROPOSAL : opts.proposal
  const planFindResult = opts.plan === undefined ? DEFAULT_PLAN : opts.plan

  const proposalUpdateFn = vi.fn().mockImplementation(async (args: { data: { status: string } }) => ({
    ...DEFAULT_PROPOSAL,
    ...args.data,
    respondedAt: new Date(),
  }))

  const planUpdateFn = vi.fn().mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    ...DEFAULT_PLAN,
    ...args.data,
  }))

  return {
    db: {
      coachNutritionProposal: {
        findUnique: vi.fn().mockResolvedValue(proposalFindResult),
        update: proposalUpdateFn,
      },
      nutritionPlan: {
        findUnique: vi.fn().mockResolvedValue(planFindResult),
        update: planUpdateFn,
      },
      $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => ops),
    } as unknown as Parameters<typeof respondCoachProposal>[0],
    proposalUpdateFn,
    planUpdateFn,
  }
}

describe('respondCoachProposal', () => {
  it('throws NOT_FOUND when proposal does not exist', async () => {
    const { db } = createMockDb({ proposal: null })

    try {
      await respondCoachProposal(db, { proposalId: 'x', athleteId: 'athlete-1', action: 'ACCEPTED' })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProposalError)
      expect((err as ProposalError).code).toBe('NOT_FOUND')
    }
  })

  it('throws NOT_FOUND when athleteId does not match', async () => {
    const { db } = createMockDb()

    try {
      await respondCoachProposal(db, { proposalId: 'prop-1', athleteId: 'other-athlete', action: 'ACCEPTED' })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProposalError)
      expect((err as ProposalError).code).toBe('NOT_FOUND')
    }
  })

  it('throws ALREADY_RESPONDED when status is not PENDING', async () => {
    const { db } = createMockDb({
      proposal: { ...DEFAULT_PROPOSAL, status: 'ACCEPTED' as never },
    })

    try {
      await respondCoachProposal(db, { proposalId: 'prop-1', athleteId: 'athlete-1', action: 'ACCEPTED' })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProposalError)
      expect((err as ProposalError).code).toBe('ALREADY_RESPONDED')
    }
  })

  it('rejects proposal without touching NutritionPlan', async () => {
    const { db, proposalUpdateFn } = createMockDb()

    await respondCoachProposal(db, { proposalId: 'prop-1', athleteId: 'athlete-1', action: 'REJECTED' })

    expect(proposalUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }),
    )
    expect(db.nutritionPlan.findUnique).not.toHaveBeenCalled()
  })

  it('throws NO_PLAN when athlete has no NutritionPlan', async () => {
    const { db } = createMockDb({ plan: null })

    try {
      await respondCoachProposal(db, { proposalId: 'prop-1', athleteId: 'athlete-1', action: 'ACCEPTED' })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ProposalError)
      expect((err as ProposalError).code).toBe('NO_PLAN')
    }
  })

  it('applies deltas to NutritionPlan and sets source=COACH on accept', async () => {
    const { db } = createMockDb()

    await respondCoachProposal(db, { proposalId: 'prop-1', athleteId: 'athlete-1', action: 'ACCEPTED' })

    expect(db.$transaction).toHaveBeenCalled()
    expect(db.nutritionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          targetKcalHard: 2700,  // 2500 + 200
          targetKcalEasy: 2400,  // 2200 + 200
          targetKcalRest: 2000,  // 1800 + 200
          proteinG: 160,         // 150 + 10
          carbsHardG: 320,       // 300 + 20
          carbsEasyG: 270,       // 250 + 20
          fatG: 75,              // 70 + 5
          source: 'COACH',
        },
      }),
    )
  })

  it('floors negative results at 0', async () => {
    const { db } = createMockDb({
      proposal: { ...DEFAULT_PROPOSAL, deltaKcal: -5000, deltaProtein: -200, deltaCarbs: -400, deltaFat: -100 },
    })

    await respondCoachProposal(db, { proposalId: 'prop-1', athleteId: 'athlete-1', action: 'ACCEPTED' })

    expect(db.nutritionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetKcalHard: 0,
          targetKcalEasy: 0,
          targetKcalRest: 0,
          proteinG: 0,
          carbsHardG: 0,
          carbsEasyG: 0,
          fatG: 0,
          source: 'COACH',
        }),
      }),
    )
  })
})
