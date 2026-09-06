import type { PrismaDbClient } from '@/lib/db/prisma_client'
import type { ISessionLogRepository } from '@/domain/ports/session_log.repository'
import type { CreateWearableSessionInput } from '@/domain/wearables/create_wearable_session.use_case'

export class PrismaSessionLogRepository implements ISessionLogRepository {
  constructor(private readonly db: PrismaDbClient) {}

  async findByExternalId(userId: string, externalId: string): Promise<{ id: string } | null> {
    return this.db.sessionLog.findFirst({
      where: { userId, externalId },
      select: { id: true },
    })
  }

  async createFromWearable(input: CreateWearableSessionInput): Promise<{ id: string }> {
    return this.db.sessionLog.create({
      data: {
        userId:           input.userId,
        externalId:       input.externalId,
        dataSource:       input.dataSource,
        discipline:       input.discipline as any,
        freeSessionType:  null,
        distanceKm:       input.distanceKm ?? undefined,
        durationMin:      input.durationMin ? Math.round(input.durationMin) : undefined,
        hrAvg:            input.hrAvg ?? undefined,
        hrMax:            input.hrMax ?? undefined,
        caloriesBurned:   input.caloriesBurned ? Math.round(input.caloriesBurned) : undefined,
        avgPaceSecPerKm:  input.avgPaceSecPerKm ? Math.round(input.avgPaceSecPerKm) : undefined,
        notes:            input.notes ?? undefined,
        completedAt:      input.sessionDate,
        plannedSessionId: null,
      },
      select: { id: true },
    })
  }
}
