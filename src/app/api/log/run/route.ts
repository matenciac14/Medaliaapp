import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const VALID_RUN_TYPES = ['RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'OTRO'] as const
type RunType = typeof VALID_RUN_TYPES[number]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = session.user.id
  const body = await req.json()
  const { type, durationMin, distanceKm, rpe, notes } = body

  if (!type || !VALID_RUN_TYPES.includes(type as RunType)) {
    return NextResponse.json({ error: 'Tipo de sesión inválido' }, { status: 400 })
  }

  const log = await prisma.sessionLog.create({
    data: {
      userId,
      plannedSessionId: null,
      freeSessionType: type,
      completedAt: new Date(),
      durationMin: durationMin ? Number(durationMin) : null,
      distanceKm: distanceKm ? Number(distanceKm) : null,
      rpe: rpe ? Number(rpe) : null,
      notes: notes ?? null,
    },
  })

  return NextResponse.json({ ok: true, id: log.id })
}
