import type { PrismaClient } from '../../generated/prisma/client'
import type { CoachNutritionProposal } from './coach_nutrition_proposal.types'

type RespondInput = {
  proposalId: string
  athleteId: string
  action: 'ACCEPTED' | 'REJECTED'
}

type RespondResult = {
  proposal: CoachNutritionProposal
}

/**
 * Responde a una propuesta nutricional del coach.
 * ACCEPT: aplica deltas al NutritionPlan del atleta en una transacción.
 * REJECT: marca la propuesta como rechazada sin cambios.
 */
export async function respondCoachProposal(
  db: PrismaClient,
  input: RespondInput,
): Promise<RespondResult> {
  const proposal = await db.coachNutritionProposal.findUnique({
    where: { id: input.proposalId },
    include: { coach: { select: { name: true } } },
  })

  if (!proposal || proposal.athleteId !== input.athleteId) {
    throw new ProposalError('NOT_FOUND', 'Propuesta no encontrada')
  }
  if (proposal.status !== 'PENDING') {
    throw new ProposalError('ALREADY_RESPONDED', 'La propuesta ya fue respondida')
  }

  if (input.action === 'REJECTED') {
    const updated = await db.coachNutritionProposal.update({
      where: { id: input.proposalId },
      data: { status: 'REJECTED', respondedAt: new Date() },
      include: { coach: { select: { name: true } } },
    })
    return { proposal: updated }
  }

  // ACCEPTED — aplicar deltas al NutritionPlan
  const nutritionPlan = await db.nutritionPlan.findUnique({
    where: { userId: input.athleteId },
  })

  if (!nutritionPlan) {
    throw new ProposalError('NO_PLAN', 'Necesitas un plan nutricional primero')
  }

  const updatedData = buildPlanUpdate(nutritionPlan, proposal)

  const [updated] = await db.$transaction([
    db.coachNutritionProposal.update({
      where: { id: input.proposalId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
      include: { coach: { select: { name: true } } },
    }),
    db.nutritionPlan.update({
      where: { userId: input.athleteId },
      data: updatedData,
    }),
  ])

  return { proposal: updated }
}

function buildPlanUpdate(
  plan: { targetKcalHard: number; targetKcalEasy: number; targetKcalRest: number; proteinG: number; carbsHardG: number; carbsEasyG: number; fatG: number },
  deltas: { deltaKcal: number; deltaProtein: number; deltaCarbs: number; deltaFat: number },
) {
  return {
    targetKcalHard: floorZero(plan.targetKcalHard + deltas.deltaKcal),
    targetKcalEasy: floorZero(plan.targetKcalEasy + deltas.deltaKcal),
    targetKcalRest: floorZero(plan.targetKcalRest + deltas.deltaKcal),
    proteinG:       floorZero(plan.proteinG + deltas.deltaProtein),
    carbsHardG:     floorZero(plan.carbsHardG + deltas.deltaCarbs),
    carbsEasyG:     floorZero(plan.carbsEasyG + deltas.deltaCarbs),
    fatG:           floorZero(plan.fatG + deltas.deltaFat),
    source:         'COACH' as const,
  }
}

function floorZero(value: number): number {
  return Math.max(0, value)
}

// --- Error ---

type ProposalErrorCode = 'NOT_FOUND' | 'ALREADY_RESPONDED' | 'NO_PLAN'

export class ProposalError extends Error {
  constructor(
    public readonly code: ProposalErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ProposalError'
  }

  get httpStatus(): number {
    switch (this.code) {
      case 'NOT_FOUND': return 404
      case 'ALREADY_RESPONDED': return 409
      case 'NO_PLAN': return 422
    }
  }
}
