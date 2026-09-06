/**
 * Infrastructure — TierFeatureConfig repository.
 *
 * Lee la configuración de features por tipo de usuario desde DB.
 * Cache en memoria con TTL de 5 minutos — se invalida cuando el admin hace PATCH.
 * En serverless el cache vive mientras la instancia esté caliente (warm).
 */

import { prisma } from '@/lib/db/prisma'
import type { AthleteUserType } from '../../generated/prisma/client'
import type { TierFeatureConfigShape } from '@/domain/subscription/tier_features'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

type CacheEntry = { data: TierFeatureConfigShape; expiresAt: number }
const cache = new Map<AthleteUserType, CacheEntry>()

// Fallback hardcodeado si la fila no existe en DB
const FALLBACK_CONFIGS: Record<AthleteUserType, TierFeatureConfigShape> = {
  B2C_FREE: { featurePlan: false, featureCheckin: false, featureNutrition: true,  featureProgress: false, featureLog: true, featureGym: true },
  B2C_PRO:  { featurePlan: true,  featureCheckin: true,  featureNutrition: true,  featureProgress: true,  featureLog: true, featureGym: true },
  B2B:      { featurePlan: true,  featureCheckin: true,  featureNutrition: true,  featureProgress: true,  featureLog: true, featureGym: true },
}

export async function getTierFeatureConfig(userType: AthleteUserType): Promise<TierFeatureConfigShape> {
  const cached = cache.get(userType)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const row = await prisma.tierFeatureConfig.findUnique({ where: { userType } })
  const data: TierFeatureConfigShape = row
    ? {
        featurePlan:      row.featurePlan,
        featureCheckin:   row.featureCheckin,
        featureNutrition: row.featureNutrition,
        featureProgress:  row.featureProgress,
        featureLog:       row.featureLog,
        featureGym:       row.featureGym,
      }
    : FALLBACK_CONFIGS[userType]

  cache.set(userType, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

export async function getAllTierFeatureConfigs(): Promise<Record<AthleteUserType, TierFeatureConfigShape & { updatedAt: Date; updatedBy: string | null }>> {
  const rows = await prisma.tierFeatureConfig.findMany()
  const result = {} as Record<AthleteUserType, TierFeatureConfigShape & { updatedAt: Date; updatedBy: string | null }>
  for (const row of rows) {
    result[row.userType] = {
      featurePlan:      row.featurePlan,
      featureCheckin:   row.featureCheckin,
      featureNutrition: row.featureNutrition,
      featureProgress:  row.featureProgress,
      featureLog:       row.featureLog,
      featureGym:       row.featureGym,
      updatedAt:        row.updatedAt,
      updatedBy:        row.updatedBy,
    }
  }
  return result
}

export async function updateTierFeatureConfig(
  userType: AthleteUserType,
  patch: Partial<TierFeatureConfigShape>,
  updatedBy: string
): Promise<TierFeatureConfigShape> {
  const row = await prisma.tierFeatureConfig.update({
    where: { userType },
    data: { ...patch, updatedBy },
  })

  const data: TierFeatureConfigShape = {
    featurePlan:      row.featurePlan,
    featureCheckin:   row.featureCheckin,
    featureNutrition: row.featureNutrition,
    featureProgress:  row.featureProgress,
    featureLog:       row.featureLog,
    featureGym:       row.featureGym,
  }

  cache.set(userType, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

export function invalidateTierFeatureCache(userType?: AthleteUserType) {
  if (userType) cache.delete(userType)
  else cache.clear()
}
