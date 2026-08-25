/**
 * Infrastructure — Prisma implementation of ICheckInRepository.
 * Maps domain field names → actual weeklyCheckIn model columns.
 */
import type { ICheckInRepository, SaveCheckInPayload } from '@/domain/ports/checkin.repository'
import type { PreviousCheckIn } from '@/domain/checkin/check-in.types'
import type { PrismaDbClient } from '@/lib/db/prisma-client'
import { prisma } from '@/lib/db/prisma'

export class PrismaCheckInRepository implements ICheckInRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async findLatest(userId: string): Promise<PreviousCheckIn | null> {
    const record = await this.db.weeklyCheckIn.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      select: { hrResting: true, weightKg: true },
    })
    if (!record) return null
    return {
      heartRate: record.hrResting,
      weight: record.weightKg,
    }
  }

  async save(userId: string, data: SaveCheckInPayload): Promise<{ id: string }> {
    const hasPain = (data.painLevel ?? 0) >= 5
    const record = {
      weightKg: data.weight ?? undefined,
      hrResting: data.heartRate ?? undefined,
      sleepHours: data.sleepHours ?? undefined,
      sleepScore: data.sleepScore ?? undefined,
      hardestSessionRpe: data.rpe ?? undefined,
      energyLevel: data.energyLevel ?? undefined,
      stressLevel: data.stressLevel ?? undefined,
      motivationLevel: data.motivation ?? null,
      nutritionAdherencePct: data.nutritionAdherence
        ? Math.round(data.nutritionAdherence * 10)  // 1-10 scale → 0-100
        : undefined,
      painLevel: data.painLevel ?? null,
      painDescription: data.painDescription ?? null,
      painFlag: hasPain,
      notes: data.notes ?? null,
      waistCm: data.waistCm ?? null,
      armsCm: data.armsCm ?? null,
      hipsCm: data.hipsCm ?? null,
      thighsCm: data.thighsCm ?? null,
      adjustmentsTriggered: data.triggers,
      recordedAt: new Date(),
    }

    // Upsert manual por (userId, planId, weekNumber) — necesario porque los partial indexes
    // de PostgreSQL no son expresables como compound key en Prisma (NULL != NULL en unique).
    const existing = await this.db.weeklyCheckIn.findFirst({
      where: { userId, planId: data.planId ?? null, weekNumber: data.weekNumber },
      select: { id: true },
    })

    if (existing) {
      await this.db.weeklyCheckIn.update({
        where: { id: existing.id },
        data: record,
      })
      return { id: existing.id }
    } else {
      const created = await this.db.weeklyCheckIn.create({
        data: { userId, planId: data.planId ?? null, weekNumber: data.weekNumber, ...record },
        select: { id: true },
      })
      return { id: created.id }
    }
  }

  async count(userId: string): Promise<number> {
    return this.db.weeklyCheckIn.count({ where: { userId } })
  }
}
