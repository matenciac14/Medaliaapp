import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildCalendarWeek } from '@/domain/calendar/build-calendar-week'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0', 10)
  if (isNaN(weekOffset) || weekOffset < -52 || weekOffset > 52) {
    return NextResponse.json({ error: 'Invalid weekOffset' }, { status: 400 })
  }

  const week = await buildCalendarWeek(session.user.id, weekOffset)
  return NextResponse.json(week)
}
