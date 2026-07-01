/**
 * Lógica pura para calcular retención de atletas a 14 días.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 *
 * "Retenido" = atleta con al menos 1 SessionLog o WeeklyCheckIn
 *              en los últimos 14 días.
 * Base = atletas con featurePlan: true (activos — excluye FREE e INACTIVE).
 */

export interface RetentionResult {
  /** Atletas únicos con actividad en el período */
  activeCount: number
  /** Atletas base con acceso activo (featurePlan: true) */
  baseCount: number
  /** Tasa de retención 0–100 (redondeado) */
  rate: number
}

/**
 * Filtra userIds únicos de una lista de eventos dentro de una ventana de tiempo.
 */
export function activeUserIdsInWindow(
  events: Array<{ userId: string; date: Date }>,
  windowMs: number,
  referenceDate: Date = new Date(),
): Set<string> {
  const cutoff = new Date(referenceDate.getTime() - windowMs)
  const ids = new Set<string>()
  for (const e of events) {
    if (e.date >= cutoff) ids.add(e.userId)
  }
  return ids
}

/**
 * Calcula la retención a N días dado el set de userIds activos y el total base.
 */
export function computeRetention(
  activeUserIds: Set<string>,
  baseCount: number,
): RetentionResult {
  const activeCount = activeUserIds.size
  const rate = baseCount > 0 ? Math.round((activeCount / baseCount) * 100) : 0
  return { activeCount, baseCount, rate }
}

/**
 * Color semántico para la tasa de retención.
 */
export function retentionColor(rate: number): string {
  if (rate >= 70) return '#16a34a' // green
  if (rate >= 40) return '#f97316' // amber
  return '#dc2626'                 // red
}
