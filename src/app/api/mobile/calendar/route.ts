import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'
import { buildCalendarWeek } from '@/infrastructure/db/calendar'
import { rateLimitAsync } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`mobile-${user.id}:calendar`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0', 10)
  if (isNaN(weekOffset) || weekOffset < -52 || weekOffset > 52) {
    return NextResponse.json({ error: 'Invalid weekOffset' }, { status: 400 })
  }

  const week = await buildCalendarWeek(user.id, weekOffset)
  return NextResponse.json(week)
}
