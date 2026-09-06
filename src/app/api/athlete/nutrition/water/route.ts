// NUT-WATER-01 — WaterLog endpoint
// GET  → { mlLogged, waterMlTarget } para hoy
// POST → body { delta: number } — upsert mlLogged += delta (mínimo 0)

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { todayInTz } from '@/lib/core/date_utils'

async function getUserTimezone(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })
  return u?.timezone ?? null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const tz = await getUserTimezone(userId)
  const today = todayInTz(tz)

  const [log, plan] = await Promise.all([
    prisma.waterLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.nutritionPlan.findUnique({ where: { userId }, select: { waterMlTarget: true } }),
  ])

  return NextResponse.json({
    mlLogged:      log?.mlLogged       ?? 0,
    waterMlTarget: plan?.waterMlTarget ?? 2000,
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json().catch(() => ({}))
  const delta = Number(body.delta)
  if (!delta || isNaN(delta)) return NextResponse.json({ error: 'delta requerido' }, { status: 400 })

  const tz = await getUserTimezone(userId)
  const today = todayInTz(tz)
  const existing = await prisma.waterLog.findUnique({ where: { userId_date: { userId, date: today } } })
  const newMl = Math.max(0, (existing?.mlLogged ?? 0) + delta)

  await prisma.waterLog.upsert({
    where:  { userId_date: { userId, date: today } },
    create: { userId, date: today, mlLogged: newMl },
    update: { mlLogged: newMl },
  })

  return NextResponse.json({ mlLogged: newMl })
}
