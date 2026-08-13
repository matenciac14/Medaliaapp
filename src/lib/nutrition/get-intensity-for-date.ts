// ---------------------------------------------------------------------------
// get-intensity-for-date.ts — Determina la intensidad de entrenamiento de un día
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db/prisma'

/**
 * Mapea el tipo de sesión / intensidad de PlannedSession al intensity string
 * que usa getDailyNutritionTarget.
 *
 * - INTERVALOS, TEMPO, TIRADA_LARGA, FARTLEK, TEST, SIMULACRO → HIGH
 * - RODAJE_Z2, FUERZA → MODERATE
 * - DESCANSO → REST
 * - Sin sesión → REST
 */
export function mapSessionToIntensity(
  session: { intensity?: string | null; type?: string | null } | null
): string {
  if (!session) return 'REST'

  // Si ya tiene intensity definida, usarla directamente
  if (session.intensity) return session.intensity

  // Fallback por type
  const highTypes = ['INTERVALOS', 'TEMPO', 'TIRADA_LARGA', 'FARTLEK', 'TEST', 'SIMULACRO']
  const moderateTypes = ['RODAJE_Z2', 'FUERZA']

  if (session.type && highTypes.includes(session.type)) return 'HIGH'
  if (session.type && moderateTypes.includes(session.type)) return 'MODERATE'
  if (session.type === 'DESCANSO') return 'REST'

  return 'REST'
}

/**
 * Dado un userId y un rango de fechas, devuelve un Map<dateKey, intensity>
 * para cada fecha basado en las PlannedSessions del plan activo.
 *
 * Fechas sin sesión planificada devuelven 'REST'.
 */
export async function getIntensityMapForDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, string>> {
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  const intensityMap = new Map<string, string>()

  if (!activePlan) return intensityMap

  const sessions = await prisma.plannedSession.findMany({
    where: {
      week: { planId: activePlan.id },
      date: { gte: startDate, lte: endDate },
    },
    select: { date: true, intensity: true, type: true },
  })

  for (const s of sessions) {
    const dateKey = s.date.toISOString().split('T')[0]
    intensityMap.set(dateKey, mapSessionToIntensity(s))
  }

  return intensityMap
}
