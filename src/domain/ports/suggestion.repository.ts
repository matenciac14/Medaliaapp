import type { SuggestionDraft } from '@/domain/checkin/generate_suggestions'

export type PendingSuggestion = {
  id: string
  userId: string
  checkInId: string
  type: string
  status: string
  title: string
  description: string
  payload: Record<string, unknown>
  expiresAt: Date
  respondedAt: Date | null
  createdAt: Date
}

/**
 * Port — contract for check-in suggestion persistence.
 */
export interface ISuggestionRepository {
  /** Create multiple suggestions atomically (called inside $transaction). */
  createMany(userId: string, checkInId: string, suggestions: SuggestionDraft[]): Promise<void>

  /** Find all PENDING suggestions for a user (not expired). */
  findPendingForUser(userId: string): Promise<PendingSuggestion[]>

  /** Find a single suggestion by id. */
  findById(id: string): Promise<PendingSuggestion | null>

  /** Mark suggestion ACCEPTED + respondedAt. Returns the updated suggestion. */
  accept(id: string, userId: string): Promise<PendingSuggestion | null>

  /** Mark suggestion REJECTED + respondedAt. */
  reject(id: string, userId: string): Promise<void>

  /** Expire all PENDING suggestions past their expiresAt. Returns count updated. */
  expireOld(): Promise<number>
}
