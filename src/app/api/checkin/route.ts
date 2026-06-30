import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { processCheckIn } from '@/domain/check-in/process-check-in.use-case'
import { PrismaCheckInRepository } from '@/infrastructure/db/check-in.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { unauthorized, ok, serverError, badRequest } from '@/lib/api/responses'
import { sendPlanUpdatedEmail } from '@/infrastructure/email/resend'
// prisma is passed as `db` so the use case can open $transaction

const checkInBodySchema = z.object({
  hardestRpe:            z.number().min(1).max(10).optional(),
  sleepHours:            z.number().min(0).max(24).optional(),
  sleepScore:            z.number().min(0).max(10).optional(),
  energyLevel:           z.number().min(1).max(10).optional(),
  stressLevel:           z.number().min(0).max(10).optional(),
  weightKg:              z.number().min(0).optional(),
  hrResting:             z.number().min(0).max(250).optional(),
  painLevel:             z.number().min(0).max(10).optional(),
  nutritionAdherencePct: z.number().min(0).max(100).optional(),
  motivationLevel:       z.number().min(0).max(10).optional(),
  notes:                 z.string().max(5000).optional(),
})

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

  const raw = await req.json()
  const parsed = checkInBodySchema.safeParse(raw)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Datos inválidos.')
  }

  const body = parsed.data

  if (body.energyLevel == null && body.hardestRpe == null) {
    return badRequest('Completa al menos la energía percibida o el RPE.')
  }

  try {
    const result = await processCheckIn(
      {
        userId: session.user.id,
        data: {
          rpe: body.hardestRpe ?? 5,
          sleepHours: body.sleepHours ?? 7,
          sleepScore: body.sleepScore,
          energyLevel: body.energyLevel ?? 5,
          stressLevel: body.stressLevel ?? 0,
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
        healthProfileRepo: new PrismaHealthProfileRepository(),
        userRepo: new PrismaUserRepository(),
      }
    )

    if (result.adjustments.length > 0 && session.user.email && session.user.name) {
      sendPlanUpdatedEmail(session.user.email, session.user.name, result.adjustments).catch(() => {})
    }

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
