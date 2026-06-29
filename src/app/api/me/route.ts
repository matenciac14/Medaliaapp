import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { timezoneSchema, localeSchema, parseBody } from '@/lib/validation'

const MeSchema = z
  .object({ timezone: timezoneSchema, locale: localeSchema })
  .refine(d => d.timezone !== undefined || d.locale !== undefined, {
    message: 'Nada que actualizar.',
  })

// PATCH /api/me — actualizar timezone y locale desde el cliente web
// El cliente envía estas variables tras detectarlas en el navegador:
//   timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
//   locale:   navigator.language
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(MeSchema, raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const data: Record<string, string> = {}
  if (parsed.data.timezone) data.timezone = parsed.data.timezone
  if (parsed.data.locale) data.locale = parsed.data.locale

  await prisma.user.update({ where: { id: session.user.id }, data })

  return NextResponse.json({ ok: true })
}
