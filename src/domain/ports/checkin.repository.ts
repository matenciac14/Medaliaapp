import type { CheckInInput, PreviousCheckIn } from '@/domain/check-in/check-in.types'

export type SaveCheckInPayload = CheckInInput & {
  trainingAdherence: number    // calculated server-side from session logs
  triggers: string[]           // adjustment triggers from rule evaluation
  weekNumber: number
  planId: string | null        // null = sin plan activo (check-in usa ISO week)
}

/**
 * Port — contract for check-in persistence.
 * Domain depends on this interface, NOT on Prisma.
 */
export interface ICheckInRepository {
  /** Most recent check-in for a user, for HR and weight baseline. */
  findLatest(userId: string): Promise<PreviousCheckIn | null>

  /** Persist check-in (upsert by userId + weekNumber). */
  save(userId: string, data: SaveCheckInPayload): Promise<void>

  /** Count total check-ins for a user (used to activate progress feature on first check-in). */
  count(userId: string): Promise<number>
}
