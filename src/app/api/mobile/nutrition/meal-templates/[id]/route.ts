import { NextRequest } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { ok, unauthorized, notFound, serverError } from '@/lib/api/responses'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mobile = await getMobileUser(req)
  if (!mobile) return unauthorized()
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:meal-templates-delete`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return ok({ error: 'Demasiadas solicitudes.' })

  const { id } = await params

  try {
    const template = await prisma.mealTemplate.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!template || template.userId !== mobile.id) return notFound()

    await prisma.mealTemplate.delete({ where: { id } })
    return ok({ ok: true })
  } catch {
    return serverError()
  }
}
