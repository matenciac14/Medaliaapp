import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ sport: null, goal: null })

  const profile = await prisma.healthProfile.findUnique({
    where: { userId: session.user.id },
    select: { sport: true, sportGoal: true },
  })

  return NextResponse.json({
    sport: profile?.sport ?? null,
    goal: profile?.sportGoal ?? null,
  })
}
