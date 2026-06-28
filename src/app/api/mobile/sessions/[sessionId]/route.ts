import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'

const VALID_TYPES = [
  'RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA',
  'FUERZA', 'CICLA', 'NATACION', 'DESCANSO', 'TEST', 'SIMULACRO', 'OTRO',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:sessions`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const { sessionId } = await params
  const userId = mobile.id
  const body = await req.json()

  const planned = await prisma.plannedSession.findFirst({
    where: { id: sessionId, week: { plan: { userId } } },
    select: { id: true },
  })
  if (!planned) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.type && VALID_TYPES.includes(body.type)) data.type = body.type
  if (typeof body.durationMin === 'number' && body.durationMin > 0) data.durationMin = body.durationMin
  if (typeof body.zoneTarget === 'string') data.zoneTarget = body.zoneTarget.trim() || null
  if (typeof body.detailText === 'string') data.detailText = body.detailText.trim() || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const updated = await prisma.plannedSession.update({
    where: { id: sessionId },
    data,
  })

  return NextResponse.json({ ok: true, session: updated })
}
