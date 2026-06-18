import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate-limit'
import { completeOnboardingUseCase } from '@/domain/onboarding/complete-onboarding.use-case'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { AnthropicService } from '@/infrastructure/ai/anthropic.service'
import type { WizardData } from '@/app/onboarding/_types'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { allowed } = await rateLimitAsync(`onboarding:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
  }

  try {
    const data: WizardData = await req.json()

    if (!data.age || !data.weightKg || !data.heightCm) {
      return NextResponse.json({ error: 'Faltan datos del perfil (edad, peso o talla).' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const result = await completeOnboardingUseCase(data, session.user.id, {
      db: prisma as any,
      planRepo: new PrismaPlanRepository(),
      aiService: new AnthropicService(),
      healthProfileRepo: new PrismaHealthProfileRepository(),
      userRepo: new PrismaUserRepository(),
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[onboarding/generate] Error:', error)
    return NextResponse.json({ error: 'Error generando el plan. Intenta de nuevo.' }, { status: 500 })
  }
}
