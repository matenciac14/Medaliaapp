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
import { sendPlanUpdatedEmail, sendCoachCheckInEmail } from '@/infrastructure/email/resend'
import { mapWebCheckinBody } from '@/lib/api/checkin-mapper'

const checkInBodySchema = z.object({
  hardestRpe:            z.number().min(1).max(10).optional(),
  sleepHours:            z.number().min(0).max(24).optional(),
  sleepScore:            z.number().min(0).max(10).optional(),
  energyLevel:           z.number().min(1).max(10).optional(),
  stressLevel:           z.number().min(0).max(10).optional(),
  weightKg:              z.number().min(10).max(500).optional(),
  hrResting:             z.number().min(0).max(250).optional(),
  painLevel:             z.number().min(0).max(10).optional(),
  nutritionAdherencePct: z.number().min(0).max(100).optional(),
  motivationLevel:       z.number().min(0).max(10).optional(),
  notes:                 z.string().max(5000).optional(),
  painDescription:       z.string().max(500).optional(),
  waistCm:               z.number().min(40).max(200).optional(),
  armsCm:                z.number().min(10).max(100).optional(),
  hipsCm:                z.number().min(40).max(200).optional(),
  thighsCm:              z.number().min(20).max(120).optional(),
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
        data: mapWebCheckinBody(body),
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

    // Notify coach (fire-and-forget, B2B athletes only)
    const athleteId = session.user.id
    const athleteName = session.user.name ?? ''
    prisma.coachAthlete.findFirst({
      where: { athleteId, status: 'ACTIVE' },
      include: { coach: { select: { email: true, name: true } } },
    }).then((rel) => {
      if (rel?.coach.email) {
        return sendCoachCheckInEmail(rel.coach.email, rel.coach.name ?? '', athleteName, athleteId, {
          energyLevel: body.energyLevel,
          hardestRpe:  body.hardestRpe,
          weightKg:    body.weightKg,
        })
      }
    }).catch(() => {})

    return ok({
      ok: true,
      adjustment: {
        severity: result.severity,
        recommendation: result.recommendation,
        adjustments: result.adjustments,
        triggers: result.triggers,
      },
    })
  } catch (err) {
    console.error('[checkin] processCheckIn error:', err)
    return serverError()
  }
}
