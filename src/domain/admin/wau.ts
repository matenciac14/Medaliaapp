/**
 * Lógica pura para calcular Weekly Active Users (WAU).
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 *
 * "Activo" = atleta con al menos 1 SessionLog o WeeklyCheckIn en esa semana.
 */

export interface ActivityEvent {
  userId: string
  date: Date
}

export interface WeekBucket {
  /** "2026-W25" — ISO year + week number */
  key: string
  /** Week number within the year (1-53) — presentation layer formats as "Sem N" */
  weekNumber: number
  count: number
}

/**
 * Devuelve el ISO week key ("2026-W25") para una fecha dada.
 */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // ISO week: thursday-based
  const dayOfWeek = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Extrae el número de semana ISO del key "2026-W25" → 25. */
function parseWeekNumber(key: string): number {
  return parseInt(key.split('-W')[1], 10)
}

/**
 * Construye los últimos N week keys (ordenados del más antiguo al más reciente).
 */
export function lastNWeekKeys(n: number, referenceDate: Date = new Date()): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(referenceDate)
    d.setUTCDate(d.getUTCDate() - i * 7)
    keys.push(isoWeekKey(d))
  }
  // deduplicate preserving order (puede haber duplicados en bordes de semana)
  return [...new Set(keys)]
}

/**
 * Calcula el WAU para las últimas N semanas a partir de eventos de actividad.
 * Los eventos de SessionLog y WeeklyCheckIn se unen antes de llamar esta función.
 */
export function computeWAU(
  events: ActivityEvent[],
  weeks: number = 8,
  referenceDate: Date = new Date(),
): WeekBucket[] {
  const targetKeys = new Set(lastNWeekKeys(weeks, referenceDate))

  // Agrupar eventos por semana → Set de userIds únicos
  const buckets = new Map<string, Set<string>>()
  for (const key of targetKeys) {
    buckets.set(key, new Set())
  }

  for (const event of events) {
    const key = isoWeekKey(event.date)
    if (buckets.has(key)) {
      buckets.get(key)!.add(event.userId)
    }
  }

  return [...targetKeys]
    .sort()
    .map((key) => ({
      key,
      weekNumber: parseWeekNumber(key),
      count: buckets.get(key)!.size,
    }))
}
