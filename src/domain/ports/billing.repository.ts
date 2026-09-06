/**
 * Port: IBillingRepository
 * Abstracción de acceso a datos para el módulo de billing.
 * La implementación Prisma vive en infrastructure/billing/billing.repository.ts.
 */
import type { CoachTier } from '../subscription/tier_features'
import type { SubscriptionSnapshot } from '../billing/billing.types'

export type UpgradeCoachData = {
  coachTier: CoachTier
  currentPeriodEnd: Date
}

export type UpgradeAthleteData = {
  currentPeriodEnd: Date
}

export interface IBillingRepository {
  findByUserId(userId: string): Promise<SubscriptionSnapshot | null>
  upgradeCoach(userId: string, data: UpgradeCoachData): Promise<void>
  upgradeAthlete(userId: string, data: UpgradeAthleteData): Promise<void>
  /**
   * Downgrade de coach a STARTER.
   * Borra currentPeriodEnd. No pausa atletas existentes (lo hace el cron si aplica).
   */
  downgradeCoach(userId: string): Promise<void>
  /**
   * Downgrade de atleta a FREE.
   * Desactiva features de pago: plan, checkin, progress.
   */
  downgradeAthlete(userId: string): Promise<void>
  /**
   * Devuelve suscripciones cuyo período de gracia ya expiró.
   * graceDays: días de gracia tras currentPeriodEnd.
   */
  findExpired(graceDays: number, now: Date): Promise<SubscriptionSnapshot[]>
  /** Guarda el ID del último webhook procesado para evitar doble procesamiento. */
  saveWebhookEventId(userId: string, eventId: string): Promise<void>
  /** Devuelve el ID del último webhook procesado para este usuario. */
  getLastWebhookEventId(userId: string): Promise<string | null>
  /** Guarda el gateway usado al crear la suscripción. */
  saveGateway(userId: string, gateway: string): Promise<void>
}
