import { NextRequest, NextResponse } from 'next/server'
import { wearableRepository } from '@/infrastructure/db/wearable.repository'
import { refreshStravaTokenIfNeeded, fetchStravaActivity } from '@/infrastructure/wearable/strava.service'
import { stravaActivityToSessionLog } from '@/infrastructure/wearable/strava.mapper'
import { createWearableSession } from '@/domain/wearables/create-wearable-session.use-case'

interface StravaWebhookEvent {
  aspect_type:     string
  object_type:     string
  object_id:       number
  owner_id:        number
  event_time:      number
  subscription_id: number
  updates?:        Record<string, string>
}

/** GET — challenge de verificación de suscripción */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode        = searchParams.get('hub.mode')
  const token       = searchParams.get('hub.verify_token')
  const challenge   = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || token !== process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ 'hub.challenge': challenge })
}

/** POST — actividad nueva de un atleta */
export async function POST(req: NextRequest) {
  // Responder 200 inmediatamente para no exceder el timeout de 2s de Strava
  const body = await req.json() as StravaWebhookEvent

  // Procesar en background (Vercel Edge + waitUntil pattern)
  processStravaEvent(body).catch((err) =>
    console.error('[strava webhook] processing error', err)
  )

  return NextResponse.json({ ok: true })
}

async function processStravaEvent(event: StravaWebhookEvent): Promise<void> {
  if (event.aspect_type !== 'create' || event.object_type !== 'activity') return

  // Mapear owner_id (Strava athleteId) → userId de Medaliq
  const conn = await wearableRepository.findByProviderAccountId(
    'strava',
    event.owner_id.toString()
  )
  if (!conn) {
    console.warn('[strava webhook] no connection found for owner_id', event.owner_id)
    return
  }

  const accessToken = await refreshStravaTokenIfNeeded(conn.userId)
  if (!accessToken) {
    console.error('[strava webhook] could not get valid token for userId', conn.userId)
    return
  }

  const activity = await fetchStravaActivity(event.object_id, accessToken)
  if (!activity) return

  const input = stravaActivityToSessionLog(activity, conn.userId)
  const { id, created } = await createWearableSession(input)

  if (created) {
    console.log('[strava webhook] session created', id, 'for user', conn.userId)
  } else {
    console.log('[strava webhook] duplicate skipped', id)
  }
}
