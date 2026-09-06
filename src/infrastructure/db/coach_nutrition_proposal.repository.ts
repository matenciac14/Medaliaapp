import type { PrismaClient } from '../../generated/prisma/client'
import type { ICoachNutritionProposalRepository } from '../../domain/ports/coach_nutrition_proposal.repository'
import type { CoachNutritionProposal, ProposeNutritionInput } from '../../domain/nutrition/coach_nutrition_proposal.types'

export class CoachNutritionProposalRepository implements ICoachNutritionProposalRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: ProposeNutritionInput): Promise<CoachNutritionProposal> {
    return this.db.coachNutritionProposal.create({
      data: {
        coachId:      input.coachId,
        athleteId:    input.athleteId,
        message:      input.message,
        deltaKcal:    input.deltaKcal,
        deltaProtein: input.deltaProtein,
        deltaCarbs:   input.deltaCarbs,
        deltaFat:     input.deltaFat,
      },
      include: { coach: { select: { name: true } } },
    })
  }

  async findPendingForAthlete(athleteId: string): Promise<CoachNutritionProposal[]> {
    return this.db.coachNutritionProposal.findMany({
      where: { athleteId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { coach: { select: { name: true } } },
    })
  }

  async respond(id: string, athleteId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<CoachNutritionProposal> {
    return this.db.coachNutritionProposal.update({
      where: { id, athleteId },
      data: { status, respondedAt: new Date() },
      include: { coach: { select: { name: true } } },
    })
  }
}
