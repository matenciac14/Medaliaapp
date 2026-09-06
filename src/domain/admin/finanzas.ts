/**
 * Lógica de negocio pura para cálculos financieros del admin.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

import type { CoachTier } from '@/domain/subscription/tier_features'

export const ATHLETE_PRO_PRICE_USD = 9.99

/**
 * Fee mensual plano por tier de coach.
 * SCALE: $129 base + $1.50 por asesorado sobre 100 (Scale+).
 */
export function coachTierFee(tier: CoachTier, athleteCount: number = 0): number {
  switch (tier) {
    case 'STARTER': return 0
    case 'GROWTH':  return 39
    case 'PRO':     return 79
    case 'SCALE':   return 129 + Math.max(0, athleteCount - 100) * 1.5
  }
}

/**
 * Etiqueta legible del tier del coach.
 */
export function coachTierFeeLabel(tier: CoachTier, athleteCount: number = 0): string {
  switch (tier) {
    case 'STARTER': return 'Starter — $0/mes'
    case 'GROWTH':  return 'Growth — $39/mes'
    case 'PRO':     return 'Pro — $79/mes'
    case 'SCALE':
      return athleteCount > 100
        ? `Scale+ — $129 + $${((athleteCount - 100) * 1.5).toFixed(0)} extra`
        : 'Scale — $129/mes'
  }
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
