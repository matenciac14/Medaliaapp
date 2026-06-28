import type { PrismaClient } from '../../generated/prisma/client'

/**
 * Type shared between the full Prisma client and a transaction client (tx).
 * The tx client passed inside $transaction has the same model methods
 * but does NOT expose lifecycle methods ($connect, $disconnect, $transaction, etc.).
 *
 * Repositories accept this type so they can be used both standalone and
 * inside a $transaction — just pass `tx` to the constructor.
 */
export type PrismaDbClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>
