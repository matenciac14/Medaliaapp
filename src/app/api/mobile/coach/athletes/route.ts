import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

// GET /api/mobile/coach/athletes — lista de atletas del coach con contador de mensajes no leídos
export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (mobile.role !== 'COACH') return NextResponse.json({ error: 'Solo para coaches.' }, { status: 403 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:coach-athletes`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const relations = await prisma.coachAthlete.findMany({
    where: { coachId: mobile.id },
    select: {
      athlete: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const athleteIds = relations.map(r => r.athlete.id)

  // Contar mensajes no leídos por atleta (mensajes enviados por el atleta al coach sin leer)
  const unreadCounts = await prisma.message.groupBy({
    by: ['fromId'],
    where: { toId: mobile.id, fromId: { in: athleteIds }, readAt: null },
    _count: { id: true },
  })

  const unreadMap = new Map(unreadCounts.map(u => [u.fromId, u._count.id]))

  const athletes = relations.map(r => ({
    id: r.athlete.id,
    name: r.athlete.name,
    email: r.athlete.email,
    unread: unreadMap.get(r.athlete.id) ?? 0,
  }))

  return NextResponse.json({ athletes })
}
