/**
 * Webhook dedicado de Wompi — producción.
 * Configurar esta URL en: dashboard.wompi.co > Configuración > Webhooks
 * URL: https://medaliq.com/api/webhooks/wompi
 *
 * Wompi envía: POST con JSON + sin header de firma en el body —
 * la integridad se verifica con signature.checksum dentro del payload.
 */
import { NextRequest, NextResponse } from 'next/server'
import { WompiPaymentGateway } from '@/infrastructure/billing/wompi-payment-gateway'
import { BillingRepository } from '@/infrastructure/billing/billing.repository'
import type { CoachTier } from '@/domain/subscription/tier-features'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const gateway = new WompiPaymentGateway()
  const repo    = new BillingRepository()

  let event
  try {
    event = await gateway.parseWebhookEvent(rawBody, '')
  } catch {
    return NextResponse.json({ error: 'Firma Wompi inválida.' }, { status: 400 })
  }

  // Idempotencia: Wompi puede reenviar el mismo evento si no respondemos 200 a tiempo
  const lastEventId = await repo.getLastWebhookEventId(event.userId)
  if (lastEventId === event.eventId) {
    return NextResponse.json({ received: true, duplicate: true, eventId: event.eventId })
  }

  switch (event.eventType) {

    case 'charge.success': {
      if (!event.newPeriodEnd) break
      const periodEnd = new Date(event.newPeriodEnd)

      if (event.userRole === 'COACH' && event.coachTargetTier) {
        await repo.upgradeCoach(
          event.userId,
          { coachTier: event.coachTargetTier as CoachTier, currentPeriodEnd: periodEnd },
          'wompi',
        )
      } else if (event.userRole === 'ATHLETE') {
        await repo.upgradeAthlete(
          event.userId,
          { currentPeriodEnd: periodEnd },
          'wompi',
        )
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
