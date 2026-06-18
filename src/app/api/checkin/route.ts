import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { processCheckIn } from '@/domain/check-in/process-check-in.use-case'
import { PrismaCheckInRepository } from '@/infrastructure/db/check-in.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { AnthropicService } from '@/infrastructure/ai/anthropic.service'
import { unauthorized, ok, serverError } from '@/lib/api/responses'
// prisma is passed as `db` so the use case can open $transaction

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const last = await prisma.weeklyCheckIn.findFirst({
    where: { userId: session.user.id },
    orderBy: { recordedAt: 'desc' },
    select: {
      weightKg: true, hrResting: true, sleepHours: true, energyLevel: true,
      hardestSessionRpe: true, sleepScore: true, stressLevel: true,
      motivationLevel: true, nutritionAdherencePct: true,
    },
  })

  return ok({
    weightKg: last?.weightKg ?? null,
    hrResting: last?.hrResting ?? null,
    sleepHours: last?.sleepHours ?? null,
    energyLevel: last?.energyLevel ?? null,
    hardestSessionRpe: last?.hardestSessionRpe ?? null,
    sleepScore: last?.sleepScore ?? null,
    stressLevel: last?.stressLevel ?? null,
    motivationLevel: last?.motivationLevel ?? null,
    nutritionAdherencePct: last?.nutritionAdherencePct ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await req.json()

  try {
    const result = await processCheckIn(
      {
        userId: session.user.id,
        data: {
          rpe: body.hardestRpe,
          sleepHours: body.sleepHours ?? 7,
          sleepScore: body.sleepScore,
          energyLevel: body.energyLevel ?? 5,
          stressLevel: body.stressLevel ?? 5,
          weight: body.weightKg,
          heartRate: body.hrResting,
          painLevel: body.painLevel,
          nutritionAdherence: body.nutritionAdherencePct
            ? Math.round(body.nutritionAdherencePct / 10)
            : undefined,
          motivation: body.motivationLevel,
          notes: body.notes,
        },
      },
      {
        db: prisma,
        checkInRepo: new PrismaCheckInRepository(),
        planRepo: new PrismaPlanRepository(),
        aiService: new AnthropicService(),
        healthProfileRepo: new PrismaHealthProfileRepository(),
        userRepo: new PrismaUserRepository(),
      }
    )

    return ok({
      ok: true,
      adjustment: {
        severity: result.severity,
        recommendation: result.recommendation,
        adjustments: result.adjustments,
      },
    })
  } catch (err) {
    console.error('[checkin] processCheckIn error:', err)
    return serverError()
  }
}
