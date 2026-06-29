import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'

const VALID_ACTIVITIES = ['GYM', 'RUN', 'REST'] as const
const VALID_SPLITS = ['PUSH', 'PULL', 'LEGS', 'FULL_BODY'] as const
const VALID_RUN_TYPES = ['RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'OTRO'] as const

type Activity = (typeof VALID_ACTIVITIES)[number]

interface RoutineDayInput {
  dow: number
  activity: Activity
  split?: string | null
  runType?: string | null
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:routine`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const routine = await prisma.weeklyRoutine.findUnique({ where: { userId: mobile.id } })
  return NextResponse.json({ routine })
}

export async function PUT(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:routine`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const body = await req.json()
  const { days, daysPerWeek } = body as { days: RoutineDayInput[]; daysPerWeek: number }

  if (!Array.isArray(days)) {
    return NextResponse.json({ error: 'days debe ser un array' }, { status: 400 })
  }
  if (typeof daysPerWeek !== 'number' || daysPerWeek < 1 || daysPerWeek > 7) {
    return NextResponse.json({ error: 'daysPerWeek debe ser un número entre 1 y 7' }, { status: 400 })
  }

  for (const day of days) {
    if (!Number.isInteger(day.dow) || day.dow < 1 || day.dow > 7) {
      return NextResponse.json({ error: `dow inválido: ${day.dow}. Debe ser entero entre 1 y 7` }, { status: 400 })
    }
    if (!(VALID_ACTIVITIES as readonly string[]).includes(day.activity)) {
      return NextResponse.json({ error: `activity inválida: ${day.activity}` }, { status: 400 })
    }
    if (day.split != null && !(VALID_SPLITS as readonly string[]).includes(day.split)) {
      return NextResponse.json({ error: `split inválido: ${day.split}` }, { status: 400 })
    }
    if (day.runType != null && !(VALID_RUN_TYPES as readonly string[]).includes(day.runType)) {
      return NextResponse.json({ error: `runType inválido: ${day.runType}` }, { status: 400 })
    }
  }

  const sanitized = days.map((day) => ({
    dow: day.dow,
    activity: day.activity,
    ...(day.activity === 'GYM' && day.split != null ? { split: day.split } : {}),
    ...(day.activity === 'RUN' && day.runType != null ? { runType: day.runType } : {}),
  }))

  const routine = await prisma.weeklyRoutine.upsert({
    where: { userId: mobile.id },
    update: { days: sanitized, daysPerWeek },
    create: { userId: mobile.id, days: sanitized, daysPerWeek },
  })

  return NextResponse.json({ routine })
}
