/**
 * Rate limiter con soporte para Upstash Redis (producción) y fallback en memoria (desarrollo).
 *
 * En producción (Vercel): configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.
 * En desarrollo: usa Map en memoria (no persistente entre instancias, suficiente para local).
 *
 * Setup Upstash:
 *   1. Crear base de datos en console.upstash.com (Free tier: 10k req/día)
 *   2. Copiar REST URL y TOKEN a .env
 *   3. El switch es automático — si las env vars existen, usa Redis; si no, usa memoria.
 */

// ─── Upstash (producción) ────────────────────────────────────────────────────

function getUpstashRateLimiter() {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  // Importación dinámica para evitar errores si no está instalado/configurado
  try {
    const { Ratelimit } = require('@upstash/ratelimit')
    const { Redis }     = require('@upstash/redis')
    return new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(10, '10 s'), // default — se sobreescribe por llamada
      analytics: false,
      prefix: 'medaliq:rl',
    })
  } catch {
    return null
  }
}

// ─── In-memory fallback (desarrollo / sin Redis) ─────────────────────────────

type RateLimitEntry = { count: number; resetAt: number }
const store = new Map<string, RateLimitEntry>()

function inMemoryRateLimit(key: string, options: { limit: number; windowMs: number }): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.limit - 1 }
  }

  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: options.limit - entry.count }
}

// ─── Upstash async rate limit helper ─────────────────────────────────────────

async function upstashRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; remaining: number }> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return inMemoryRateLimit(key, options)

  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis }     = await import('@upstash/redis')

    const windowSec = Math.ceil(options.windowMs / 1000)
    const rl = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(options.limit, `${windowSec} s`),
      analytics: false,
      prefix: 'medaliq:rl',
    })

    const { success, remaining } = await rl.limit(key)
    return { allowed: success, remaining }
  } catch {
    // Si Redis falla, usar fallback — never block legitimate traffic due to Redis outage
    return inMemoryRateLimit(key, options)
  }
}

// ─── API pública ─────────────────────────────────────────────────────────────

type Options = {
  limit: number     // máximo de requests
  windowMs: number  // ventana de tiempo en ms
}

/**
 * Rate limit síncrono (fallback en memoria).
 * Usar para endpoints donde no se puede hacer async al inicio de la función.
 */
export function rateLimit(key: string, options: Options): { allowed: boolean; remaining: number } {
  return inMemoryRateLimit(key, options)
}

/**
 * Rate limit asíncrono con soporte Redis.
 * Usar en API routes con operaciones costosas.
 * Si UPSTASH_REDIS_REST_URL está configurado, usa Redis (funciona en serverless).
 * Si no, usa in-memory como fallback.
 */
export async function rateLimitAsync(key: string, options: Options): Promise<{ allowed: boolean; remaining: number }> {
  return upstashRateLimit(key, options)
}
