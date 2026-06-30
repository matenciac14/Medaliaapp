import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { plan } = await req.json() // 'FREE' | 'PRO' | 'COACH'

  const now = new Date()

  let data: Parameters<typeof prisma.user.update>[0]['data']
  let role: 'ATHLETE' | 'COACH'

  if (plan === 'COACH') {
    role = 'COACH'
    data = {
      role,
      featurePlan:      false,
      featureCheckin:   false,
      featureNutrition: false,
      featureProgress:  false,
      featureLog:       false,
      featureCoach:     true,
      featureGym:       false,
      onboardingCompleted:   true,
      onboardingCompletedAt: now,
    }
  } else if (plan === 'PRO') {
    role = 'ATHLETE'
    data = {
      role,
      featurePlan:      true,
      featureCheckin:   true,
      featureNutrition: true,
      featureProgress:  true,
      featureLog:       true,
      featureCoach:     false,
      featureGym:       true,
    }
  } else {
    // FREE — dashboard básico + log manual únicamente
    role = 'ATHLETE'
    data = {
      role,
      featurePlan:      false,
      featureCheckin:   false,
      featureNutrition: false,
      featureProgress:  false,
      featureLog:       true,
      featureCoach:     false,
      featureGym:       false,
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, role: true, featurePlan: true, featureCoach: true, onboardingCompleted: true },
  })

  return NextResponse.json({ ok: true, user })
}
