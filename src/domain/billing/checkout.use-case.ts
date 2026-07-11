/**
 * Caso de uso: crear sesión de checkout.
 * Lógica pura — sin Prisma, sin Next.js, sin gateway concreto.
 */
import type { IPaymentGateway } from '../ports/payment-gateway.port'
import type { CoachTier } from '../subscription/tier-features'
import type { CoachCheckoutInput, AthleteCheckoutInput, CheckoutOutput } from './billing.types'

const COACH_TIER_ORDER: CoachTier[] = ['STARTER', 'GROWTH', 'PRO', 'SCALE']

/**
 * Valida que targetTier sea un tier superior al current.
 * Lanza error si es un downgrade o el mismo tier.
 */
export function validateCoachUpgrade(current: CoachTier, target: CoachTier): void {
  const currentIdx = COACH_TIER_ORDER.indexOf(current)
  const targetIdx  = COACH_TIER_ORDER.indexOf(target)
  if (targetIdx <= currentIdx) {
    throw new Error(
      `No se puede hacer upgrade a ${target}: ya estás en ${current} o superior.`
    )
  }
}

/**
 * Devuelve el siguiente tier disponible para un coach, o null si ya está en SCALE.
 */
export function nextCoachTier(current: CoachTier): CoachTier | null {
  const idx = COACH_TIER_ORDER.indexOf(current)
  return idx < COACH_TIER_ORDER.length - 1 ? COACH_TIER_ORDER[idx + 1] : null
}

export async function createCoachCheckout(
  input: CoachCheckoutInput,
  gateway: IPaymentGateway
): Promise<CheckoutOutput> {
  validateCoachUpgrade(input.currentTier, input.targetTier)
  return gateway.createCoachCheckout(input)
}

export async function createAthleteCheckout(
  input: AthleteCheckoutInput,
  gateway: IPaymentGateway
): Promise<CheckoutOutput> {
  return gateway.createAthleteCheckout(input)
}
