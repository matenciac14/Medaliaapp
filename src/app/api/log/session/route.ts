import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

interface LogSessionBody {
  plannedSessionId?: string
  completed?: boolean
  rpe?: number
  distanceKm?: number
  durationMin?: number
  hrAvg?: number
  hrMax?: number
  notes?: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = session.user.id
  const body: LogSessionBody = await req.json()

  // Verificar ownership si viene plannedSessionId
  if (body.plannedSessionId) {
    const planned = await prisma.plannedSession.findFirst({
      where: { id: body.plannedSessionId, week: { plan: { userId } } },
      select: { id: true },
    })
    if (!planned) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }
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
