import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate-limit'
import { completeOnboardingUseCase } from '@/domain/onboarding/complete-onboarding.use-case'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { sendAthleteReadyEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push'
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
      db: prisma,
      planRepo: new PrismaPlanRepository(),
      healthProfileRepo: new PrismaHealthProfileRepository(),
      userRepo: new PrismaUserRepository(),
      txRepoFactory: (tx) => ({
        healthProfileRepo: new PrismaHealthProfileRepository(tx),
        userRepo: new PrismaUserRepository(tx),
        planRepo: new PrismaPlanRepository(tx),
      }),
    })

    if (result.isB2B) {
      const coachRel = await prisma.coachAthlete.findFirst({
        where: { athleteId: session.user.id },
        select: { coach: { select: { email: true, name: true, pushToken: true } } },
      })
      if (coachRel?.coach) {
        const { coach } = coachRel
        const athleteName = session.user.name ?? 'Tu atleta'
        sendPushNotification(coach.pushToken ?? null, `${athleteName} completó su perfil`, 'Entra al panel para asignarle un plan de entrenamiento.').catch(() => {})
        sendAthleteReadyEmail(coach.email ?? '', coach.name ?? 'Coach', athleteName, session.user.id).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[onboarding/generate] Error:', error)
    return NextResponse.json({ error: 'Error configurando la cuenta. Intenta de nuevo.' }, { status: 500 })
  }
}
