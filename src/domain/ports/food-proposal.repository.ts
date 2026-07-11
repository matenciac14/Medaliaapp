export type ProposeFoodInput = {
  submittedById: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  servingG?: number
  servingLabel?: string
  country?: string | null
  notes?: string | null
}

export type FoodProposalRow = {
  id: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  country: string | null
  notes: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  foodId: string | null
  createdAt: Date
  submittedBy?: { name: string | null }
}

export type ReviewInput = {
  proposalId: string
  reviewedById: string
  action: 'APPROVE' | 'REJECT'
  reviewNote?: string
}

export interface IFoodProposalRepository {
  propose(input: ProposeFoodInput): Promise<{ proposalId: string; foodId: string }>
  listByUser(userId: string): Promise<FoodProposalRow[]>
  listPending(limit?: number): Promise<FoodProposalRow[]>
  review(input: ReviewInput): Promise<void>
  countPending(): Promise<number>
}
