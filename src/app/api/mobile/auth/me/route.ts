import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

const USER_SELECT = {
  id: true, email: true, name: true, role: true,
  featurePlan: true, featureCheckin: true, featureNutrition: true,
  featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
  onboardingCompleted: true,
} as const

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: mobile.id },
    select: USER_SELECT,
  })

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const features = {
    plan:      user.featurePlan,
    checkin:   user.featureCheckin,
    nutrition: user.featureNutrition,
    progress:  user.featureProgress,
    log:       user.featureLog,
    coach:     user.featureCoach,
    gym:       user.featureGym,
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
    userPlan: 'PRO',
    features,
  })
}
