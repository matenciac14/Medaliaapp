/**
 * Caso de uso: downgrade automático de suscripciones expiradas.
 * Lógica pura — sin Prisma, sin Next.js.
 */
import type { IBillingRepository } from '../ports/billing.repository'
import { BILLING_GRACE_DAYS } from './billing.types'

/**
 * Devuelve true si el período de gracia ya expiró para la suscripción dada.
 * El grace period empieza al día siguiente de currentPeriodEnd.
 */
export function isGracePeriodExpired(
  currentPeriodEnd: Date,
  now: Date,
  graceDays: number = BILLING_GRACE_DAYS
): boolean {
  const graceEnd = new Date(currentPeriodEnd)
  graceEnd.setDate(graceEnd.getDate() + graceDays)
  return now > graceEnd
}

/**
 * Corre el ciclo de billing diario:
 * Busca suscripciones con grace period expirado → downgrade.
 * @returns número de suscripciones degradadas
 */
export async function runBillingCheck(
  repo: IBillingRepository,
  now: Date = new Date()
): Promise<{ downgradedCount: number }> {
  const expired = await repo.findExpired(BILLING_GRACE_DAYS, now)
  let downgradedCount = 0

  for (const sub of expired) {
    if (sub.userRole === 'COACH') {
      await repo.downgradeCoach(sub.userId)
    } else {
      await repo.downgradeAthlete(sub.userId)
    }
    downgradedCount++
  }

  return { downgradedCount }
}
