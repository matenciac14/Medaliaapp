/**
 * Infrastructure — Prisma implementation of ICheckInRepository.
 * Maps domain field names → actual weeklyCheckIn model columns.
 */
import type { ICheckInRepository, SaveCheckInPayload } from '@/domain/ports/checkin.repository'
import type { PreviousCheckIn } from '@/domain/check-in/check-in.types'
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

  async save(userId: string, data: SaveCheckInPayload): Promise<void> {
    const hasPain = (data.painLevel ?? 0) >= 5
    const record = {
      weightKg: data.weight ?? undefined,
      hrResting: data.heartRate ?? undefined,
      sleepHours: data.sleepHours,
      sleepScore: data.sleepScore ?? undefined,
      hardestSessionRpe: data.rpe,
      energyLevel: data.energyLevel,
      stressLevel: data.stressLevel,
      motivationLevel: data.motivation ?? null,
      nutritionAdherencePct: data.nutritionAdherence
        ? Math.round(data.nutritionAdherence * 10)  // 1-10 scale → 0-100
        : undefined,
      painLevel: data.painLevel ?? null,
      painDescription: data.painDescription ?? null,
      painFlag: hasPain,
      notes: data.notes ?? null,
      adjustmentsTriggered: data.triggers,
      recordedAt: new Date(),
    }

    await this.db.weeklyCheckIn.upsert({
      where: { userId_weekNumber: { userId, weekNumber: data.weekNumber } },
      update: record,
      create: { userId, weekNumber: data.weekNumber, ...record },
    })
  }

  async count(userId: string): Promise<number> {
    return this.db.weeklyCheckIn.count({ where: { userId } })
  }
}
