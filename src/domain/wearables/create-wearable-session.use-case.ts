/**
 * Use Case: Create Wearable Session
 *
 * Idempotent upsert — deduplicates by (userId, externalId).
 * Called by Strava and HealthKit webhook routes.
 *
 * Pure domain — no Prisma imports. Depends on ISessionLogRepository.
 */
import type { ISessionLogRepository } from '@/domain/ports/session-log.repository'

export type WearableDataSource = 'STRAVA' | 'GARMIN' | 'HEALTHKIT'
export type WearableDiscipline = 'RUNNING' | 'STRENGTH' | 'CYCLING' | 'SWIMMING' | 'OTHER'

export interface CreateWearableSessionInput {
  userId: string
  externalId: string
  dataSource: WearableDataSource
  discipline: WearableDiscipline
  distanceKm?: number | null
  durationMin?: number | null
  hrAvg?: number | null
  hrMax?: number | null
  caloriesBurned?: number | null
  avgPaceSecPerKm?: number | null
  sessionDate: Date
  notes?: string | null
}

export async function createWearableSession(
  input: CreateWearableSessionInput,
  sessionLogRepo: ISessionLogRepository,
): Promise<{ id: string; created: boolean }> {
  const existing = await sessionLogRepo.findByExternalId(input.userId, input.externalId)
  if (existing) return { id: existing.id, created: false }

  const log = await sessionLogRepo.createFromWearable(input)
  return { id: log.id, created: true }
}
