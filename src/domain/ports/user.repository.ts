import type { UserConfig } from '@/lib/config/user-config'

type FeatureKey = keyof UserConfig['features']

/**
 * Port — contract for user-level configuration updates.
 */
export interface IUserRepository {
  /** Enable a specific feature flag in UserConfig. */
  enableFeature(userId: string, feature: FeatureKey): Promise<void>
  /** Replaces the entire User.config JSON. Caller merges existing config before calling. */
  updateConfig(userId: string, config: UserConfig): Promise<void>
}
