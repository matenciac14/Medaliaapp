import type { CreateWearableSessionInput } from '@/domain/wearables/create-wearable-session.use-case'

export interface ISessionLogRepository {
  findByExternalId(userId: string, externalId: string): Promise<{ id: string } | null>
  createFromWearable(input: CreateWearableSessionInput): Promise<{ id: string }>
}
