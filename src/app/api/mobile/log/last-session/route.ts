import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { prisma } from '@/lib/db/prisma'

// GET /api/mobile/log/last-session?type=RODAJE_Z2
// Devuelve la última sesión libre del atleta de ese tipo para mostrar comparativa en log-run
export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:log-last-session`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const type = req.nextUrl.searchParams.get('type')
  if (!type) return NextResponse.json({ error: 'Tipo requerido' }, { status: 400 })

  const log = await prisma.sessionLog.findFirst({
    where: { userId: mobile.id, freeSessionType: type as never },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      completedAt: true,
      durationMin: true,
      distanceKm: true,
      rpe: true,
      notes: true,
    },
  })

  return NextResponse.json({ log: log ?? null })
}
