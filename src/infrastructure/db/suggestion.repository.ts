/**
 * Infrastructure — Prisma implementation of ISuggestionRepository.
 */
import type { ISuggestionRepository, PendingSuggestion } from '@/domain/ports/suggestion.repository'
import type { SuggestionDraft } from '@/domain/checkin/generate_suggestions'
import type { PrismaDbClient } from '@/lib/db/prisma_client'
import { prisma } from '@/lib/db/prisma'

export class PrismaSuggestionRepository implements ISuggestionRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async createMany(userId: string, checkInId: string, suggestions: SuggestionDraft[]): Promise<void> {
    if (suggestions.length === 0) return
    await this.db.checkInSuggestion.createMany({
      data: suggestions.map(s => ({
        userId,
        checkInId,
        type: s.type,
        title: s.title,
        description: s.description,
        payload: s.payload as any, // Prisma InputJsonValue — safe cast
        expiresAt: s.expiresAt,
      })),
    })
  }

  async findPendingForUser(userId: string): Promise<PendingSuggestion[]> {
    const rows = await this.db.checkInSuggestion.findMany({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(this.toDto)
  }

  async findById(id: string): Promise<PendingSuggestion | null> {
    const row = await this.db.checkInSuggestion.findUnique({ where: { id } })
    return row ? this.toDto(row) : null
  }

  async accept(id: string, userId: string): Promise<PendingSuggestion | null> {
    const existing = await this.db.checkInSuggestion.findFirst({
      where: { id, userId, status: 'PENDING' },
    })
    if (!existing) return null
    const updated = await this.db.checkInSuggestion.update({
      where: { id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })
    return this.toDto(updated)
  }

  async reject(id: string, userId: string): Promise<void> {
    const existing = await this.db.checkInSuggestion.findFirst({
      where: { id, userId, status: 'PENDING' },
    })
    if (!existing) return
    await this.db.checkInSuggestion.update({
      where: { id },
      data: { status: 'REJECTED', respondedAt: new Date() },
    })
  }

  async expireOld(): Promise<number> {
    const result = await this.db.checkInSuggestion.updateMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    })
    return result.count
  }

  private toDto(row: {
    id: string
    userId: string
    checkInId: string
    type: string
    status: string
    title: string
    description: string
    payload: unknown
    expiresAt: Date
    respondedAt: Date | null
    createdAt: Date
  }): PendingSuggestion {
    return {
      id: row.id,
      userId: row.userId,
      checkInId: row.checkInId,
      type: row.type,
      status: row.status,
      title: row.title,
      description: row.description,
      payload: row.payload as Record<string, unknown>,
      expiresAt: row.expiresAt,
      respondedAt: row.respondedAt,
      createdAt: row.createdAt,
    }
  }
}
