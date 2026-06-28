/**
 * Infrastructure — Prisma implementation of IUserRepository.
 */
import type { IUserRepository } from '@/domain/ports/user.repository'
import type { UserConfig } from '@/lib/config/user-config'
import type { PrismaDbClient } from '@/lib/db/prisma-client'
import { parseUserConfig } from '@/lib/config/user-config'
import { prisma } from '@/lib/db/prisma'

type FeatureKey = keyof UserConfig['features']

export class PrismaUserRepository implements IUserRepository {
  constructor(private db: PrismaDbClient = prisma) {}

  async enableFeature(userId: string, feature: FeatureKey): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { config: true },
    })
    if (!user) return

    const config = parseUserConfig(user.config)
    config.features[feature] = true

    await this.db.user.update({
      where: { id: userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { config: config as any },
    })
  }

  async updateConfig(userId: string, config: UserConfig): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { config: config as any },
    })
  }
}
