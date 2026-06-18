/**
 * generator.ts — Thin adapter (legacy public API preserved).
 *
 * Delegates to generatePlanUseCase in the domain layer.
 * Kept for backwards compatibility with any callers that still import generatePlan() directly.
 * New code should call generatePlanUseCase() or completeOnboardingUseCase() directly.
 */

export type { GeneratePlanInput, GeneratePlanResult } from '@/domain/plan/generate-plan.use-case'

import { generatePlanUseCase, type GeneratePlanInput } from '@/domain/plan/generate-plan.use-case'
import { prisma } from '@/lib/db/prisma'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { AnthropicService } from '@/infrastructure/ai/anthropic.service'

export async function generatePlan(input: GeneratePlanInput) {
  return generatePlanUseCase(input, {
    db: prisma as any,
    planRepo: new PrismaPlanRepository(),
    aiService: new AnthropicService(),
    userRepo: new PrismaUserRepository(),
  })
}
