// INTENTIONAL EXCEPTION to hexagonal architecture:
// 302+ importers make moving this to infrastructure/db/ infeasible without a migration sprint.
// This is the single source of truth for the Prisma singleton — do not duplicate it.
// infrastructure/db/ repositories import from here.
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 10 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any — Prisma 7 adapter constructor typing limitation
  return new PrismaClient({ adapter } as any)
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
