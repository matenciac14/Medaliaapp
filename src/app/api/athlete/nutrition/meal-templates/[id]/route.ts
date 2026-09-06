import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { ok, unauthorized, notFound, serverError } from '@/lib/api/responses'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { id } = await params

  try {
    const template = await prisma.mealTemplate.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!template || template.userId !== session.user.id) return notFound()

    await prisma.mealTemplate.delete({ where: { id } })
    return ok({ ok: true })
  } catch {
    return serverError()
  }
}
