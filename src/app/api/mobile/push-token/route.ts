import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getMobileUser } from '@/lib/mobile-auth'
import { prisma } from '@/lib/db/prisma'
import { parseBody } from '@/lib/validation'

const PushTokenSchema = z.object({
  token: z.string().min(1).startsWith('ExponentPushToken['),
})

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(PushTokenSchema, raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  await prisma.user.update({
    where: { id: mobile.id },
    data: { pushToken: parsed.data.token },
  })

  return NextResponse.json({ ok: true })
}
