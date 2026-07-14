import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate-limit'
import { generatePlanUseCase } from '@/domain/plan/generate-plan.use-case'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'

/**
 * POST /api/plan/generate
 *
 * Genera un TrainingPlan template-based para el atleta B2C autenticado.
 * Requiere: featurePlan = true, HealthProfile completo, onboardingCompleted = true.
 * Source: 'AI' (generado automáticamente, sin coach).
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const userId = session.user.id

  const ip = (req.headers as Headers).get('x-forwarded-for') ?? 'unknown'
  const { allowed } = await rateLimitAsync(`plan-generate:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  }

  const profile = await prisma.healthProfile.findUnique({
    where: { userId },
    select: {
      age: true,
      heightCm: true,
      weightKg: true,
      weightGoalKg: true,
      gender: true,
      hrResting: true,
      hrMax: true,
      sessionMinutes: true,
      sportGoal: true,
      injuries: true,
      conditions: true,
    },
  })

  if (!profile?.age || !profile.heightCm || !profile.weightKg) {
    return NextResponse.json({ error: 'Perfil incompleto. Completa el onboarding primero.' }, { status: 400 })
  }

  if (!profile.sportGoal) {
    return NextResponse.json({ error: 'Sin meta deportiva. Completa el onboarding primero.' }, { status: 400 })
  }

  const routine = await prisma.weeklyRoutine.findUnique({
    where: { userId },
    select: { daysPerWeek: true },
  })

  try {
    const result = await generatePlanUseCase(
      {
        userId,
        goalType: profile.sportGoal,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        weightGoalKg: profile.weightGoalKg ?? undefined,
        gender: (profile.gender as 'male' | 'female') ?? 'male',
        hrResting: profile.hrResting ?? undefined,
        hrMax: profile.hrMax ?? undefined,
        daysPerWeek: routine?.daysPerWeek ?? 4,
        hoursPerSession: ((profile.sessionMinutes ?? 60) / 60),
        injuries: parseList(profile.injuries as string | string[] | undefined),
        conditions: parseList(profile.conditions as string | string[] | undefined),
        nutritionCommitment: 'moderate',
        generatedBy: 'AI',
      },
      {
        db: prisma,
        planRepo: new PrismaPlanRepository(),
        userRepo: new PrismaUserRepository(),
      }
    )

    return NextResponse.json({ planId: result.planId }, { status: 201 })
  } catch (error) {
    console.error('[plan/generate] Error:', error)
    return NextResponse.json({ error: 'Error generando el plan. Intenta de nuevo.' }, { status: 500 })
  }
}

function parseList(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.split(',').map(s => s.trim()).filter(Boolean)
}
