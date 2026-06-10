import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const { enabled } = await req.json()

  const user = await prisma.user.findUnique({ where: { id }, select: { config: true } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const config = parseUserConfig(user.config)

  await prisma.user.update({
    where: { id },
    data: {
      config: {
        ...config,
        features: { ...config.features, aiCoach: !!enabled },
        ai: { ...config.ai, monthlyLimit: enabled ? 999999 : 0 },
      } as object,
    },
  })

  return NextResponse.json({ ok: true, aiCoach: !!enabled })
}
