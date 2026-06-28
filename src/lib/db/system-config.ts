import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

/**
 * SystemConfig cacheado — TTL 1h, revalidado al actualizar AIProfile desde /admin/ai.
 * Evita hit a DB en cada llamada a /api/ai/chat y generación de planes.
 */
export const getCachedSystemConfig = unstable_cache(
  async () => {
    return prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
  },
  ['system-config-singleton'],
  { revalidate: 3600, tags: ['system-config'] }
)
