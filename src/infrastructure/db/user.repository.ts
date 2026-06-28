/**
 * Infrastructure — Prisma implementation of IUserRepository.
 */
import type { IUserRepository, FeatureKey } from '@/domain/ports/user.repository'
import type { UserConfig } from '@/lib/config/user-config'
import type { PrismaDbClient } from '@/lib/db/prisma-client'
import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db/prisma'

export class PrismaUserRepository implements IUserRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async enableFeature(userId: string, feature: FeatureKey): Promise<void> {
    await this.db.$executeRaw`
      UPDATE "User"
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb,
        '{features}'::text[],
        (COALESCE(config->'features', '{}') || jsonb_build_object(${feature}, true))::jsonb
      )
      WHERE id = ${userId}
    `
  }

  async enableFeatures(userId: string, features: FeatureKey[]): Promise<void> {
    if (features.length === 0) return
    await this.mergeFeatures(userId, Object.fromEntries(features.map(f => [f, true])))
  }

  async mergeFeatures(userId: string, patch: Partial<Record<FeatureKey, boolean>>): Promise<void> {
    if (Object.keys(patch).length === 0) return
    const patchJson = JSON.stringify(patch)
    await this.db.$executeRaw`
      UPDATE "User"
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb,
        '{features}'::text[],
        (COALESCE(config->'features', '{}') || ${patchJson}::jsonb)::jsonb
      )
      WHERE id = ${userId}
    `
  }

  async completeOnboarding(
    userId: string,
    opts: {
      features?: Partial<Record<FeatureKey, boolean>>
      onboarding: { completed: boolean; completedAt: string }
      sport: { type: string; goal: string }
      plan?: { currentWeek: number; totalWeeks: number; phase: string }
    }
  ): Promise<void> {
    const top: Record<string, unknown> = { onboarding: opts.onboarding, sport: opts.sport }
    if (opts.plan) top.plan = opts.plan
    const topJson = JSON.stringify(top)

    if (opts.features && Object.keys(opts.features).length > 0) {
      const featJson = JSON.stringify(opts.features)
      // Deep-merge features (preserves existing flags); replace onboarding/sport/plan at top level
      await this.db.$executeRaw`
        UPDATE "User"
        SET config = jsonb_set(
          COALESCE(config, '{}')::jsonb || ${topJson}::jsonb,
          '{features}'::text[],
          (COALESCE(config->'features', '{}') || ${featJson}::jsonb)::jsonb
        )
        WHERE id = ${userId}
      `
    } else {
      await this.db.$executeRaw`
        UPDATE "User"
        SET config = COALESCE(config, '{}')::jsonb || ${topJson}::jsonb
        WHERE id = ${userId}
      `
    }
  }

  async updatePlanState(userId: string, plan: { currentWeek: number; totalWeeks: number; phase: string }): Promise<void> {
    const planJson = JSON.stringify(plan)
    await this.db.$executeRaw`
      UPDATE "User"
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb,
        '{plan}'::text[],
        ${planJson}::jsonb
      )
      WHERE id = ${userId}
    `
  }

  async updateConfig(userId: string, config: UserConfig): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { config: config as unknown as Prisma.InputJsonValue },
    })
  }
}
