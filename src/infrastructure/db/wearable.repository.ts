import { prisma } from '@/lib/db/prisma'
import type {
  IWearableRepository,
  WearableConnection,
  WearableConnectionData,
  WearableProvider,
} from '@/domain/ports/wearable.repository'

function mapRow(row: {
  id: string
  userId: string
  provider: string
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
  providerAccountId?: string | null
  createdAt: Date
  updatedAt: Date
}): WearableConnection {
  return {
    id:                row.id,
    userId:            row.userId,
    provider:          row.provider as WearableProvider,
    accessToken:       row.accessToken,
    refreshToken:      row.refreshToken,
    expiresAt:         row.expiresAt,
    scopes:            row.scopes,
    providerAccountId: (row as any).providerAccountId ?? null,
    createdAt:         row.createdAt,
    updatedAt:         row.updatedAt,
  }
}

const SELECT = {
  id: true, userId: true, provider: true, accessToken: true,
  refreshToken: true, expiresAt: true, scopes: true, createdAt: true, updatedAt: true,
} as const

export class PrismaWearableRepository implements IWearableRepository {
  async findByUserAndProvider(userId: string, provider: WearableProvider): Promise<WearableConnection | null> {
    const row = await prisma.wearableConnection.findUnique({
      where: { userId_provider: { userId, provider } },
      select: SELECT,
    })
    return row ? mapRow(row) : null
  }

  async findByProviderAccountId(provider: WearableProvider, providerAccountId: string): Promise<WearableConnection | null> {
    const row = await (prisma.wearableConnection as any).findFirst({
      where: { provider, providerAccountId },
      select: SELECT,
    })
    return row ? mapRow(row) : null
  }

  async findAllByUser(userId: string): Promise<WearableConnection[]> {
    const rows = await prisma.wearableConnection.findMany({
      where: { userId },
      select: SELECT,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(mapRow)
  }

  async upsert(data: WearableConnectionData & { providerAccountId?: string | null }): Promise<WearableConnection> {
    const row = await (prisma.wearableConnection as any).upsert({
      where: { userId_provider: { userId: data.userId, provider: data.provider } },
      create: {
        userId:            data.userId,
        provider:          data.provider,
        accessToken:       data.accessToken,
        refreshToken:      data.refreshToken ?? null,
        expiresAt:         data.expiresAt ?? null,
        scopes:            data.scopes,
        providerAccountId: data.providerAccountId ?? null,
      },
      update: {
        accessToken:       data.accessToken,
        refreshToken:      data.refreshToken ?? null,
        expiresAt:         data.expiresAt ?? null,
        scopes:            data.scopes,
        providerAccountId: data.providerAccountId ?? null,
      },
      select: SELECT,
    })
    return mapRow(row)
  }

  async updateTokens(
    userId: string,
    provider: WearableProvider,
    tokens: { accessToken: string; expiresAt?: Date | null }
  ): Promise<void> {
    await prisma.wearableConnection.update({
      where: { userId_provider: { userId, provider } },
      data: { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt ?? null },
    })
  }

  async delete(userId: string, provider: WearableProvider): Promise<void> {
    await prisma.wearableConnection.delete({
      where: { userId_provider: { userId, provider } },
    })
  }
}

export const wearableRepository = new PrismaWearableRepository()
