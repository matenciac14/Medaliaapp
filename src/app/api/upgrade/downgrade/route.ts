import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { config: true },
  })
  const currentConfig = parseUserConfig(existing?.config)

  const newConfig = {
    ...currentConfig,
    features: {
      ...currentConfig.features,
      aiPlan: false,
      aiCoach: false,
    },
    ai: {
      ...currentConfig.ai,
      monthlyLimit: 0,
    },
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { config: newConfig },
  })

  return NextResponse.json({ ok: true })
}
