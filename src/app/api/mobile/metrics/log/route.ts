import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { todayInTz } from '@/lib/core/date_utils'
import { z } from 'zod'

const DailyLogSchema = z.object({
  weightKg:    z.number().positive().max(500).optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  hrResting:   z.number().int().min(20).max(250).optional(),
  sleepHours:  z.number().min(0).max(24).optional(),
  notes:       z.string().max(500).optional(),
})

async function getUserTimezone(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })
  return u?.timezone ?? null
}

// GET — today's DailyLog for this user
export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:metrics-log-get`, { limit: 120, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const tz = await getUserTimezone(mobile.id)
  const today = todayInTz(tz)

  const log = await prisma.dailyLog.findUnique({
    where: { userId_date: { userId: mobile.id, date: today } },
    select: { weightKg: true, energyLevel: true, hrResting: true, sleepHours: true, notes: true, date: true },
  })

  return NextResponse.json({ log })
}

// POST — upsert today's DailyLog
export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:metrics-log-post`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const parsed = DailyLogSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })

  const { weightKg, energyLevel, hrResting, sleepHours, notes } = parsed.data

  if (weightKg == null && energyLevel == null && hrResting == null && sleepHours == null) {
    return NextResponse.json({ error: 'Al menos un campo requerido.' }, { status: 400 })
  }

  const tz = await getUserTimezone(mobile.id)
  const today = todayInTz(tz)

  const log = await prisma.dailyLog.upsert({
    where: { userId_date: { userId: mobile.id, date: today } },
    create: { userId: mobile.id, date: today, weightKg, energyLevel, hrResting, sleepHours, notes },
    update: {
      ...(weightKg    != null && { weightKg }),
      ...(energyLevel != null && { energyLevel }),
      ...(hrResting   != null && { hrResting }),
      ...(sleepHours  != null && { sleepHours }),
      ...(notes       != null && { notes }),
    },
    select: { weightKg: true, energyLevel: true, hrResting: true, sleepHours: true, date: true },
  })

  return NextResponse.json({ log }, { status: 200 })
}
