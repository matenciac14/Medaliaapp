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

/** Ranking numérico para resolver conflictos: HIGH > MODERATE > REST */
export function intensityRank(intensity: string): number {
  if (intensity === 'HIGH') return 3
  if (intensity === 'MODERATE') return 2
  return 1
}
