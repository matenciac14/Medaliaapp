export type CoachProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type CoachNutritionProposal = {
  id: string
  coachId: string
  athleteId: string
  message: string
  deltaKcal: number
  deltaProtein: number
  deltaCarbs: number
  deltaFat: number
  status: CoachProposalStatus
  respondedAt: Date | null
  createdAt: Date
  coach?: { name: string | null }
}

export type ProposeNutritionInput = {
  coachId: string
  athleteId: string
  message: string
  deltaKcal: number
  deltaProtein: number
  deltaCarbs: number
  deltaFat: number
}
