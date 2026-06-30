/**
 * Lógica de negocio pura para cálculos financieros del admin.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

export const ATHLETE_PRO_PRICE_USD = 9.99

/**
 * Calcula el fee mensual que un coach debe pagar a Medaliq
 * según el número de atletas activos bajo su gestión.
 *
 * Tramos:
 *   1–50   → $6/atleta
 *   51–100 → $5/atleta
 *   +100   → $3/atleta
 */
export function coachFeeRate(athleteCount: number): number {
  if (athleteCount <= 0)  return 0
  if (athleteCount <= 50)  return athleteCount * 6
  if (athleteCount <= 100) return 50 * 6 + (athleteCount - 50) * 5
  return 50 * 6 + 50 * 5 + (athleteCount - 100) * 3
}

/**
 * Etiqueta legible del tramo de fee aplicado a un coach.
 */
export function feeLabel(athleteCount: number): string {
  if (athleteCount <= 0)   return '—'
  if (athleteCount <= 50)  return '$6/atleta'
  if (athleteCount <= 100) return '$5/atleta (>50)'
  return '$3/atleta (>100)'
}

/**
 * Calcula el MRR estimado de atletas Pro.
 */
export function mrrAthletes(proAthleteCount: number): number {
  return proAthleteCount * ATHLETE_PRO_PRICE_USD
}

/**
 * Calcula el MRR estimado de fees de coaches (suma de todos los fees).
 */
export function mrrCoaches(fees: number[]): number {
  return fees.reduce((sum, f) => sum + f, 0)
}
