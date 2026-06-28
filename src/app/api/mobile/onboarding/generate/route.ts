import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken } from '@/lib/mobile-auth'
import { parseUserConfig, getUserPlan } from '@/lib/config/user-config'
import { rateLimitAsync } from '@/lib/rate-limit'
import { completeOnboardingUseCase } from '@/domain/onboarding/complete-onboarding.use-case'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import type { WizardData } from '@/app/onboarding/_types'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { allowed } = await rateLimitAsync(`onboarding-mobile:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  try {
    const data: WizardData = await req.json()

    if (!data.age || !data.weightKg || !data.heightCm) {
      return NextResponse.json({ error: 'Faltan datos del perfil (edad, peso o talla).' }, { status: 400 })
    }

    const result = await completeOnboardingUseCase(data, mobile.id, {
      db: prisma,
      planRepo: new PrismaPlanRepository(),
      healthProfileRepo: new PrismaHealthProfileRepository(),
      userRepo: new PrismaUserRepository(),
    })

    // Mobile needs a refreshed token with onboardingCompleted=true and updated features
    const updatedUser = await prisma.user.findUnique({
      where: { id: mobile.id },
      select: { config: true },
    })
    const updatedConfig = parseUserConfig(updatedUser?.config)
    const token = await signMobileToken({
      id: mobile.id,
      email: mobile.email,
      name: mobile.name,
      role: mobile.role,
      onboardingCompleted: true,
      userPlan: getUserPlan(updatedConfig.features),
      features: updatedConfig.features,
    })

    return NextResponse.json({ success: true, ...result, token })
  } catch (error) {
    console.error('[mobile/onboarding/generate]', error)
    return NextResponse.json({ error: 'Error generando el plan. Intenta de nuevo.' }, { status: 500 })
  }
}
