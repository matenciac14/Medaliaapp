import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken } from '@/lib/mobile-auth'
import { parseUserConfig, getUserPlan, COACH_CONFIG, DEFAULT_USER_CONFIG } from '@/lib/config/user-config'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { role } = await req.json()
  if (role !== 'ATHLETE' && role !== 'COACH') {
    return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
  }

  const initialConfig = role === 'COACH' ? COACH_CONFIG : DEFAULT_USER_CONFIG

  const updatedUser = await prisma.user.update({
    where: { id: mobile.id },
    data: { role, config: initialConfig as object },
    select: { id: true, email: true, name: true, role: true, config: true },
  })

  const config = parseUserConfig(updatedUser.config)

  const token = await signMobileToken({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name ?? '',
    role: updatedUser.role,
    onboardingCompleted: config.onboarding.completed,
    userPlan: getUserPlan(config.features),
    features: config.features,
  })

  return NextResponse.json({
    token,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      onboardingCompleted: config.onboarding.completed,
      userPlan: getUserPlan(config.features),
      features: config.features,
    },
  })
}
