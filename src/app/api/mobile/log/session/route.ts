import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { requireFeature } from '@/lib/guards/feature-gate'
import { z } from 'zod'

const LogSessionSchema = z.object({
  sessionId: z.string().uuid().optional(),
  sessionType: z.string().max(50).optional(),
  completed: z.boolean().optional(),
  actualDurationMin: z.number().int().min(0).max(600).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  hrAvg: z.number().int().min(30).max(250).optional(),
  distanceKm: z.number().min(0).max(1000).optional(),
  notes: z.string().max(2000).optional(),
}).refine(d => d.sessionId || d.sessionType, { message: 'sessionId o sessionType requerido' })

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:log-session`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'log')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const parsed = LogSessionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })
  const { sessionId, sessionType, completed, actualDurationMin, rpe, hrAvg, distanceKm, notes } = parsed.data

  // ── Log libre (sin plan) ──────────────────────────────────────────────────
  if (!sessionId) {
    if (!completed) return NextResponse.json({ ok: true, skipped: true })
    const log = await prisma.sessionLog.create({
      data: {
        userId,
        plannedSessionId: null,
        freeSessionType: sessionType,
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

  // ── Log vinculado a plan ──────────────────────────────────────────────────
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
