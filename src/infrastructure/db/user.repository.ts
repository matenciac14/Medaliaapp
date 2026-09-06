/**
 * Infrastructure — Prisma implementation of IUserRepository.
 * Escribe directamente a columnas de User (no al JSON blob config).
 */
import type { IUserRepository, FeatureKey } from '@/domain/ports/user.repository'
import type { PrismaDbClient } from '@/lib/db/prisma_client'
import { prisma } from '@/lib/db/prisma'

const FEATURE_COLUMN: Record<FeatureKey, string> = {
  plan:      'featurePlan',
  checkin:   'featureCheckin',
  nutrition: 'featureNutrition',
  progress:  'featureProgress',
  log:       'featureLog',
  coach:     'featureCoach',
  gym:       'featureGym',
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async enableFeature(userId: string, feature: FeatureKey): Promise<void> {
    const col = FEATURE_COLUMN[feature]
    await this.db.$executeRawUnsafe(
      `UPDATE "User" SET "${col}" = true WHERE id = $1`,
      userId
    )
  }

  async enableFeatures(userId: string, features: FeatureKey[]): Promise<void> {
    if (features.length === 0) return
    await this.mergeFeatures(userId, Object.fromEntries(features.map(f => [f, true])))
  }

  async mergeFeatures(userId: string, patch: Partial<Record<FeatureKey, boolean>>): Promise<void> {
    const entries = Object.entries(patch) as [FeatureKey, boolean][]
    if (entries.length === 0) return

    const sets = entries.map(([k, v]) => `"${FEATURE_COLUMN[k]}" = ${v}`).join(', ')
    await this.db.$executeRawUnsafe(
      `UPDATE "User" SET ${sets} WHERE id = $1`,
      userId
    )
  }

  async completeOnboarding(
    userId: string,
    opts: {
      features?: Partial<Record<FeatureKey, boolean>>
      onboarding: { completed: boolean; completedAt: string }
      sport: { type: string; goal: string }
    }
  ): Promise<void> {
    const featureSets = opts.features
      ? (Object.entries(opts.features) as [FeatureKey, boolean][])
          .map(([k, v]) => `"${FEATURE_COLUMN[k]}" = ${v}`)
          .join(', ') + ', '
      : ''

    await this.db.$executeRawUnsafe(
      `UPDATE "User" SET
        ${featureSets}
        "onboardingCompleted"   = $2,
        "onboardingCompletedAt" = $3
       WHERE id = $1`,
      userId,
      opts.onboarding.completed,
      new Date(opts.onboarding.completedAt)
    )

    // sport type + goal → HealthProfile
    await this.db.$executeRawUnsafe(
      `UPDATE "HealthProfile"
       SET sport = $2, "sportGoal" = $3
       WHERE "userId" = $1`,
      userId,
      opts.sport.type,
      opts.sport.goal
    )
  }
}
