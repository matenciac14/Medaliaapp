/**
 * TrmService — obtiene el TRM (1 USD en COP) con la siguiente jerarquía:
 *
 *   1. Cache interno (TTL 1h) → datos.gov.co (Superintendencia Financiera oficial)
 *   2. Env var TRM_USD_COP — override manual para emergencias o dev local
 *   3. DEFAULT_TRM — último fallback; SIEMPRE se loggea para detectar en producción
 *
 * El cache vive en la instancia — no hay estado global de módulo.
 * Tests instancian TrmService directamente con un adapter stub; producción usa el singleton.
 */

import type { ITrmProvider } from '@/domain/ports/trm.provider'
import { BancoRepublicaTrmAdapter } from './banco-republica-trm.adapter'

export const DEFAULT_TRM = 4200
const TTL_MS = 60 * 60 * 1000 // 1 hora

/** TRM con metadatos para mostrar en UI de precios. */
export type TrmMeta = {
  value: number
  /** ISO date string (YYYY-MM-DD) de cuándo aplica el TRM. Null si es fallback. */
  date: string | null
  /** Fuente del valor — útil para debugging. */
  source: 'api' | 'env' | 'default'
}

type CachedTrm = { value: number; date: string; fetchedAt: number }

export class TrmService {
  private cache: CachedTrm | null = null

  constructor(private readonly provider: ITrmProvider) {}

  async getWithMeta(): Promise<TrmMeta> {
    try {
      const { value, date } = await this.fetchWithCache()
      return { value, date, source: 'api' }
    } catch (err) {
      console.error('[TRM] Error fetching from datos.gov.co — usando fallback:', err)
    }

    const raw = process.env.TRM_USD_COP
    if (raw) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed) && parsed > 0) {
        console.warn('[TRM] Usando env var TRM_USD_COP:', parsed)
        return { value: parsed, date: null, source: 'env' }
      }
    }

    console.error('[TRM] ALERTA: usando DEFAULT_TRM hardcodeado. Revisar conectividad con datos.gov.co.')
    return { value: DEFAULT_TRM, date: null, source: 'default' }
  }

  async get(): Promise<number> {
    const { value } = await this.getWithMeta()
    return value
  }

  private async fetchWithCache(): Promise<CachedTrm> {
    const now = Date.now()
    if (this.cache && now - this.cache.fetchedAt < TTL_MS) return this.cache
    const result = await this.provider.getCurrentTrm()
    this.cache = { value: result.value, date: result.date, fetchedAt: now }
    return this.cache
  }
}

// Singleton de producción — los callers importan estas funciones directamente
const productionService = new TrmService(new BancoRepublicaTrmAdapter())

export async function getTrmWithMeta(): Promise<TrmMeta> {
  return productionService.getWithMeta()
}

export async function getTrm(): Promise<number> {
  return productionService.get()
}

/** Fallback síncrono — solo cuando async no es posible. */
export function getTrmSync(): number {
  const raw = process.env.TRM_USD_COP
  if (!raw) return DEFAULT_TRM
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TRM
}
