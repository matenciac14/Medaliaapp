import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { requireFeature } from '@/lib/guards/feature-gate'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:log-session`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'log')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const body = await req.json()
  const { sessionId, completed, actualDurationMin, rpe, hrAvg, distanceKm, notes } = body

  if (!sessionId) return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })

  // Verificar ownership
  const planned = await prisma.plannedSession.findFirst({
    where: { id: sessionId, week: { plan: { userId } } },
    select: { id: true },
  })
  if (!planned) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  // Si no la completó, no creamos log (la sesión queda pendiente)
  if (!completed) return NextResponse.json({ ok: true, skipped: true })

  // Idempotente: si ya existe un log para esta sesión, devolver éxito
  const existing = await prisma.sessionLog.findUnique({
    where: { plannedSessionId: sessionId },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ ok: true, id: existing.id, alreadyLogged: true })

  const log = await prisma.sessionLog.create({
    data: {
      userId,
      plannedSessionId: sessionId,
      completedAt: new Date(),
      rpe: rpe ?? null,
      hrAvg: hrAvg ?? null,
      durationMin: actualDurationMin ?? null,
      distanceKm: distanceKm ?? null,
      notes: notes ?? null,
    },
  })

  return NextResponse.json({ ok: true, id: log.id })
}
