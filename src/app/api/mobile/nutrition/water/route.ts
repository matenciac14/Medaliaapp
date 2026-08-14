// NUT-WATER-01 (mobile) — WaterLog endpoint
// GET  → { mlLogged, waterMlTarget }
// POST → body { delta: number } — upsert mlLogged += delta (min 0)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'

function todayUtcMidnight() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:water-get`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = mobile.id
  const today = todayUtcMidnight()

  const [log, plan] = await Promise.all([
    prisma.waterLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.nutritionPlan.findUnique({ where: { userId }, select: { waterMlTarget: true } }),
  ])

  return NextResponse.json({
    mlLogged: log?.mlLogged ?? 0,
    waterMlTarget: plan?.waterMlTarget ?? 2000,
  })
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:water-post`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = mobile.id
  const body = await req.json().catch(() => ({}))
  const delta = Number(body.delta)
  if (!delta || isNaN(delta)) return NextResponse.json({ error: 'delta requerido' }, { status: 400 })

  const today = todayUtcMidnight()
  const existing = await prisma.waterLog.findUnique({ where: { userId_date: { userId, date: today } } })
  const newMl = Math.max(0, (existing?.mlLogged ?? 0) + delta)

  await prisma.waterLog.upsert({
    where:  { userId_date: { userId, date: today } },
    create: { userId, date: today, mlLogged: newMl },
    update: { mlLogged: newMl },
  })

  return NextResponse.json({ mlLogged: newMl })
}
