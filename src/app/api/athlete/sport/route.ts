import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ sport: null, goal: null })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { config: true },
  })

  const config = parseUserConfig(user?.config)
  return NextResponse.json({
    sport: config.sport?.type ?? null,
    goal: config.sport?.goal ?? null,
  })
}
