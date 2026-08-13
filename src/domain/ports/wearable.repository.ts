export type WearableProvider = 'strava' | 'garmin' | 'healthkit'

export interface WearableConnectionData {
  userId: string
  provider: WearableProvider
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
  scopes: string[]
  /** Proveedor-specific athlete/account ID — para mapear webhooks de vuelta al userId */
  providerAccountId?: string | null
}

export interface WearableConnection extends WearableConnectionData {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface IWearableRepository {
  findByUserAndProvider(userId: string, provider: WearableProvider): Promise<WearableConnection | null>
  /** Busca por providerAccountId — necesario para mapear webhooks (ej. Strava owner_id) */
  findByProviderAccountId(provider: WearableProvider, providerAccountId: string): Promise<WearableConnection | null>
  findAllByUser(userId: string): Promise<WearableConnection[]>
  upsert(data: WearableConnectionData & { providerAccountId?: string | null }): Promise<WearableConnection>
  updateTokens(
    userId: string,
    provider: WearableProvider,
    tokens: { accessToken: string; expiresAt?: Date | null }
  ): Promise<void>
  delete(userId: string, provider: WearableProvider): Promise<void>
}
