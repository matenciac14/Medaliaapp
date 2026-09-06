import type { CreateWearableSessionInput } from '@/domain/wearables/create_wearable_session.use_case'

export interface ISessionLogRepository {
  findByExternalId(userId: string, externalId: string): Promise<{ id: string } | null>
  createFromWearable(input: CreateWearableSessionInput): Promise<{ id: string }>
}
