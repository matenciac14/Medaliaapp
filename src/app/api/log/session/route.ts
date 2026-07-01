import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const LogSessionSchema = z.object({
  plannedSessionId: z.string().uuid().optional(),
  completed: z.boolean().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  distanceKm: z.number().min(0).max(1000).optional(),
  durationMin: z.number().int().min(0).max(600).optional(),
  hrAvg: z.number().int().min(30).max(250).optional(),
  hrMax: z.number().int().min(30).max(250).optional(),
  notes: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = session.user.id
  const parsed = LogSessionSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })
  const body = parsed.data

  // Si completed === false, no registrar (la sesión queda pendiente)
  if (body.completed === false) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Verificar ownership si viene plannedSessionId
  if (body.plannedSessionId) {
    const planned = await prisma.plannedSession.findFirst({
      where: { id: body.plannedSessionId, week: { plan: { userId } } },
      select: { id: true },
    })
    if (!planned) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    // Idempotente: si ya existe log, devolver éxito
    const existing = await prisma.sessionLog.findUnique({
      where: { plannedSessionId: body.plannedSessionId },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ ok: true, id: existing.id, alreadyLogged: true })
  }

  const log = await prisma.sessionLog.create({
    data: {
      userId,
      plannedSessionId: body.plannedSessionId ?? null,
      completedAt: new Date(),
      rpe: body.rpe,
      hrAvg: body.hrAvg,
      hrMax: body.hrMax,
      distanceKm: body.distanceKm,
      durationMin: body.durationMin,
      notes: body.notes,
    },
  })

  return NextResponse.json({ ok: true, id: log.id })
}
