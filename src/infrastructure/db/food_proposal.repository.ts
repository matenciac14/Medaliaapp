import type { IFoodProposalRepository, ProposeFoodInput, FoodProposalRow, ReviewInput } from '@/domain/ports/food_proposal.repository'
import type { PrismaDbClient } from '@/lib/db/prisma_client'
import { prisma } from '@/lib/db/prisma'

export class PrismaFoodProposalRepository implements IFoodProposalRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async propose(input: ProposeFoodInput): Promise<{ proposalId: string; foodId: string }> {
    return this.db.$transaction(async (tx) => {
      const food = await tx.food.create({
        data: {
          name:          input.name,
          category:      input.category,
          kcalPer100g:   input.kcalPer100g,
          proteinPer100g: input.proteinPer100g,
          carbsPer100g:  input.carbsPer100g,
          fatPer100g:    input.fatPer100g,
          servingG:      input.servingG ?? 100,
          servingLabel:  input.servingLabel ?? null,
          country:       input.country ?? null,
          source:        'community',
          isVerified:    false,
          isActive:      true,
          createdBy:     input.submittedById,
        },
        select: { id: true },
      })

      const proposal = await tx.foodProposal.create({
        data: {
          submittedById: input.submittedById,
          name:          input.name,
          category:      input.category,
          kcalPer100g:   input.kcalPer100g,
          proteinPer100g: input.proteinPer100g,
          carbsPer100g:  input.carbsPer100g,
          fatPer100g:    input.fatPer100g,
          country:       input.country ?? null,
          notes:         input.notes ?? null,
          foodId:        food.id,
          status:        'PENDING',
        },
        select: { id: true },
      })

      return { proposalId: proposal.id, foodId: food.id }
    })
  }

  async listByUser(userId: string): Promise<FoodProposalRow[]> {
    return this.db.foodProposal.findMany({
      where:   { submittedById: userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
      select:  {
        id: true, name: true, category: true,
        kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
        country: true, notes: true, status: true, reviewNote: true, foodId: true, createdAt: true,
      },
    })
  }

  async listPending(limit = 50): Promise<FoodProposalRow[]> {
    return this.db.foodProposal.findMany({
      where:   { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take:    limit,
      select:  {
        id: true, name: true, category: true,
        kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
        country: true, notes: true, status: true, reviewNote: true, foodId: true, createdAt: true,
        submittedBy: { select: { name: true } },
      },
    })
  }

  async review(input: ReviewInput): Promise<void> {
    const proposal = await this.db.foodProposal.findUnique({
      where:  { id: input.proposalId },
      select: { foodId: true, status: true },
    })
    if (!proposal || proposal.status !== 'PENDING') return

    await this.db.$transaction(async (tx) => {
      await tx.foodProposal.update({
        where: { id: input.proposalId },
        data:  {
          status:       input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          reviewedById: input.reviewedById,
          reviewNote:   input.reviewNote ?? null,
        },
      })

      if (proposal.foodId) {
        if (input.action === 'APPROVE') {
          await tx.food.update({
            where: { id: proposal.foodId },
            data:  { isVerified: true },
          })
        } else {
          await tx.food.update({
            where: { id: proposal.foodId },
            data:  { isActive: false },
          })
        }
      }
    })
  }

  async countPending(): Promise<number> {
    return this.db.foodProposal.count({ where: { status: 'PENDING' } })
  }
}
