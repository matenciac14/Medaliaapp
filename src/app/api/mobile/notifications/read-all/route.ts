import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await prisma.notification.updateMany({
    where: { userId: mobile.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}
