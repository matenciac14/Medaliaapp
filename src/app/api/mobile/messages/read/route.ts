import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

// PATCH /api/mobile/messages/read — { fromId } → marca como leídos
export async function PATCH(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:messages-read`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const { fromId } = await req.json()
  if (!fromId) return NextResponse.json({ error: 'fromId requerido' }, { status: 400 })

  await prisma.message.updateMany({
    where: { fromId, toId: mobile.id, readAt: null },
    data: { readAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
