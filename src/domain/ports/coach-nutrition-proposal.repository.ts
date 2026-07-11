import type { CoachNutritionProposal, ProposeNutritionInput } from '../nutrition/coach-nutrition-proposal.types'

export interface ICoachNutritionProposalRepository {
  create(input: ProposeNutritionInput): Promise<CoachNutritionProposal>
  findPendingForAthlete(athleteId: string): Promise<CoachNutritionProposal[]>
  respond(id: string, athleteId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<CoachNutritionProposal>
}
