import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/integrations/strava/callback`

  const url = new URL(STRAVA_AUTH_URL)
  url.searchParams.set('client_id',     process.env.STRAVA_CLIENT_ID ?? '')
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope',         'activity:read_all')
  // state = userId para verificar ownership en el callback
  url.searchParams.set('state',         session.user.id)

  return NextResponse.redirect(url.toString())
}
