/**
 * Webhook genérico de pago — usado solo en dev/stub.
 * Producción usa /api/webhooks/wompi (Wompi-específico con firma propia).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getPaymentGateway } from '@/infrastructure/billing/payment-gateway.factory'
import { BillingRepository } from '@/infrastructure/billing/billing.repository'
import type { CoachTier } from '@/domain/subscription/tier-features'

export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const rawBody   = await req.text()
  const signature = req.headers.get('x-payment-signature') ?? ''

  const gateway = getPaymentGateway()
  const repo    = new BillingRepository()

  let event
  try {
    event = await gateway.parseWebhookEvent(rawBody, signature)
  } catch {
    return NextResponse.json({ error: 'Firma de webhook inválida.' }, { status: 400 })
  }

  // Idempotencia: ignorar si ya procesamos este evento
  const lastEventId = await repo.getLastWebhookEventId(event.userId)
  if (lastEventId === event.eventId) {
    return NextResponse.json({ received: true, duplicate: true, eventId: event.eventId })
  }

  switch (event.eventType) {

    case 'charge.success': {
      if (!event.newPeriodEnd) break
      const periodEnd = new Date(event.newPeriodEnd)

      if (event.userRole === 'COACH' && event.coachTargetTier) {
        await repo.upgradeCoach(event.userId, {
          coachTier: event.coachTargetTier as CoachTier,
          currentPeriodEnd: periodEnd,
        })
      } else if (event.userRole === 'ATHLETE') {
        await repo.upgradeAthlete(event.userId, { currentPeriodEnd: periodEnd })
      }
      await repo.saveWebhookEventId(event.userId, event.eventId)
      break
    }

    case 'charge.failed':
      // Sin downgrade inmediato — el cron billing-check maneja el período de gracia.
      break

    case 'subscription.cancelled':
      if (event.userRole === 'COACH') {
        await repo.downgradeCoach(event.userId)
      } else {
        await repo.downgradeAthlete(event.userId)
      }
      await repo.saveWebhookEventId(event.userId, event.eventId)
      break
  }

  return NextResponse.json({ received: true, eventId: event.eventId })
}
