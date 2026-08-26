// ---------------------------------------------------------------------------
// get-intensity-for-date.ts — DB query: intensity map for a date range
// Pure domain logic (mapSessionToIntensity) lives in @/domain/nutrition/session-intensity
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db/prisma'
import { mapSessionToIntensity, intensityRank } from '@/domain/nutrition/session-intensity'

export { mapSessionToIntensity } from '@/domain/nutrition/session-intensity'

/**
 * Dado un userId y un rango de fechas, devuelve un Map<dateKey, intensity>
 * para cada fecha basado en PlannedSessions del plan activo +
 * GymSessions de rutinas asignadas (AssignedWorkout).
 *
 * Prioridad: si un día tiene PlannedSession, usa esa intensidad.
 * Si solo tiene GymSession (rutina asignada sin plan), infiere MODERATE.
 * Fechas sin ninguna sesión devuelven 'REST' implícitamente (no se agregan al mapa).
 */
export async function getIntensityMapForDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, string>> {
  const [activePlan, gymSessions] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
    // Gym sessions from AssignedWorkout that DON'T have a PlannedSession
    prisma.gymSession.findMany({
      where: {
        athleteId: userId,
        date: { gte: startDate, lte: endDate },
        assignedWorkoutId: { not: null },
        plannedSessionId: null,
      },
      select: { date: true },
    }),
  ])

  const intensityMap = new Map<string, string>()

  // 1. Gym-only days (AssignedWorkout sin PlannedSession) → MODERATE
  for (const gs of gymSessions) {
    const dateKey = gs.date.toISOString().split('T')[0]
    intensityMap.set(dateKey, 'MODERATE')
  }

  // 2. PlannedSessions override gym-only entries (higher specificity)
  if (activePlan) {
    const sessions = await prisma.plannedSession.findMany({
      where: {
        week: { planId: activePlan.id },
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, intensity: true, type: true },
    })

    for (const s of sessions) {
      const dateKey = s.date.toISOString().split('T')[0]
      const planned = mapSessionToIntensity(s)
      const existing = intensityMap.get(dateKey)
      // Si ya hay un día con gym y el plan dice algo más intenso, usar el más alto
      if (!existing || intensityRank(planned) > intensityRank(existing)) {
        intensityMap.set(dateKey, planned)
      }
    }
  }

  return intensityMap
}
