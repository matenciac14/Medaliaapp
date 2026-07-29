import { prisma } from '@/lib/db/prisma'

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

/**
 * Idempotente: upsert por (userId, externalId).
 * Strava y HealthKit llaman este use case — no duplicar lógica de insert.
 */
export async function createWearableSession(
  input: CreateWearableSessionInput
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.sessionLog.findFirst({
    where: { userId: input.userId, externalId: input.externalId },
    select: { id: true },
  })

  if (existing) {
    return { id: existing.id, created: false }
  }

  const log = await prisma.sessionLog.create({
    data: {
      userId:          input.userId,
      externalId:      input.externalId,
      dataSource:      input.dataSource,
      discipline:      input.discipline as any,
      freeSessionType: null,
      distanceKm:      input.distanceKm ?? undefined,
      durationMin:     input.durationMin ? Math.round(input.durationMin) : undefined,
      hrAvg:           input.hrAvg ?? undefined,
      hrMax:           input.hrMax ?? undefined,
      caloriesBurned:  input.caloriesBurned ? Math.round(input.caloriesBurned) : undefined,
      avgPaceSecPerKm: input.avgPaceSecPerKm ? Math.round(input.avgPaceSecPerKm) : undefined,
      notes:           input.notes ?? undefined,
      completedAt:     input.sessionDate,
      plannedSessionId: null,
    },
    select: { id: true },
  })

  return { id: log.id, created: true }
}
