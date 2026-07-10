/**
 * Tipos puros del dominio de billing.
 * Sin dependencias de Prisma, Next.js ni ningún gateway de pago.
 */
import type { CoachTier } from '../subscription/tier-features'

// ── Precios (fuente canónica del dominio) ─────────────────────────────────────

export const COACH_TIER_PRICES_USD: Record<CoachTier, number> = {
  STARTER: 0,
  GROWTH: 39,
  PRO: 79,
  SCALE: 129,
}

export const ATHLETE_PRO_PRICE_USD = 9.99

/** Días de gracia tras expiración antes de hacer downgrade efectivo. */
export const BILLING_GRACE_DAYS = 3

// ── Input / Output de checkout ────────────────────────────────────────────────

export type BillingUserRole = 'COACH' | 'ATHLETE'

export type CoachCheckoutInput = {
  userId: string
  currentTier: CoachTier
  targetTier: CoachTier
  successUrl: string
  cancelUrl: string
}

export type AthleteCheckoutInput = {
  userId: string
  successUrl: string
  cancelUrl: string
}

export type CheckoutOutput = {
  checkoutUrl: string
  sessionId: string
}

// ── Eventos de webhook ────────────────────────────────────────────────────────

export type WebhookEventType =
  | 'charge.success'
  | 'charge.failed'
  | 'subscription.cancelled'

export type WebhookEvent = {
  /** ID único del evento — usado para idempotencia. */
  eventId: string
  eventType: WebhookEventType
  userId: string
  userRole: BillingUserRole
  /** Presente en charge.success: nueva fecha de fin del período. */
  newPeriodEnd?: Date
  /** Presente en charge.success de coach: tier pagado. */
  coachTargetTier?: CoachTier
}

// ── Snapshot de suscripción (vista de dominio, sin modelos Prisma) ─────────────

export type SubscriptionSnapshot = {
  userId: string
  userRole: BillingUserRole
  tier: 'FREE' | 'PRO' | 'TRIAL'
  coachTier: CoachTier
  currentPeriodEnd: Date | null
}
