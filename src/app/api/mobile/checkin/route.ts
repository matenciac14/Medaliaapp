import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { processCheckIn } from '@/domain/check-in/process-check-in.use-case'
import { PrismaCheckInRepository } from '@/infrastructure/db/check-in.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { unauthorized, ok, serverError, badRequest } from '@/lib/api/responses'
import { getPlanWeekNumber, getCurrentISOWeek } from '@/lib/core/week-number'
import { sendPlanUpdatedEmail, sendCoachCheckInEmail } from '@/infrastructure/email/resend'
import { z } from 'zod'

const mobileCheckInSchema = z.object({
  energyLevel:     z.number().min(1).max(5),
  muscleSoreness:  z.number().min(1).max(5),
  stressLevel:     z.number().min(1).max(5).optional(),
  motivationLevel: z.number().min(0).max(10).optional(),
  sleepScore:      z.number().min(0).max(10).optional(),
  painLevel:       z.number().min(0).max(10).optional(),
  weightKg:        z.number().min(10).max(500).optional(),
  hrResting:       z.number().min(0).max(250).optional(),
  sleepHours:      z.number().min(0).max(24).optional(),
  nutritionAdherencePct: z.number().min(0).max(100).optional(),
  notes:           z.string().max(5000).optional(),
  waistCm:         z.number().min(40).max(200).optional(),
  armsCm:          z.number().min(10).max(100).optional(),
  hipsCm:          z.number().min(40).max(200).optional(),
  thighsCm:        z.number().min(20).max(120).optional(),
})

/** Mobile sends energy and stress on a 1-5 scale — normalize to 1-10 for consistency. */
function scale5to10(v: number): number {
  return Math.round(v * 2)
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return unauthorized()
  const { allowed: rlOk } = await rateLimitAsync(`mobile-${mobile.id}:checkin`, { limit: 300, windowMs: 60_000 })
  if (!rlOk) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  try {
    const plan = await prisma.trainingPlan.findFirst({
      where: { userId: mobile.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { startDate: true, totalWeeks: true },
    })

    const weekNumber = plan
      ? getPlanWeekNumber(plan.startDate, plan.totalWeeks)
      : getCurrentISOWeek()

    const existing = await prisma.weeklyCheckIn.findFirst({
      where: { userId: mobile.id, weekNumber },
      select: {
        id: true,
        weightKg: true,
        hrResting: true,
        sleepHours: true,
        sleepScore: true,
        energyLevel: true,
        stressLevel: true,
        motivationLevel: true,
        hardestSessionRpe: true,
        painLevel: true,
        notes: true,
        recordedAt: true,
      },
    })

    return ok({
      submitted: !!existing,
      weekNumber,
      data: existing ?? null,
    })
  } catch (err) {
    console.error('[mobile/checkin GET]', err)
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return unauthorized()
  const { allowed: rlOk } = await rateLimitAsync(`mobile-${mobile.id}:checkin`, { limit: 100, windowMs: 60_000 })
  if (!rlOk) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const raw = await req.json()
  const parsed = mobileCheckInSchema.safeParse(raw)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Datos inválidos.')
  }

  const body = parsed.data

  try {
    const result = await processCheckIn(
      {
        userId: mobile.id,
        data: {
          rpe: scale5to10(body.muscleSoreness),
          sleepHours: body.sleepHours ?? 7,
          sleepScore: body.sleepScore,
          energyLevel: scale5to10(body.energyLevel),
          stressLevel: scale5to10(body.stressLevel ?? 3),
          weight: body.weightKg,
          heartRate: body.hrResting,
          painLevel: body.painLevel,
          motivation: body.motivationLevel,
          nutritionAdherence: body.nutritionAdherencePct !== undefined
            ? Math.round(body.nutritionAdherencePct / 10)
            : undefined,
          notes: body.notes,
          waistCm: body.waistCm,
          armsCm: body.armsCm,
          hipsCm: body.hipsCm,
          thighsCm: body.thighsCm,
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

    if (result.adjustments.length > 0) {
      sendPlanUpdatedEmail(mobile.email, mobile.name, result.adjustments).catch(() => {})
    }

    // Notify coach (fire-and-forget, B2B athletes only)
    prisma.coachAthlete.findFirst({
      where: { athleteId: mobile.id, status: 'ACTIVE' },
      include: { coach: { select: { email: true, name: true } } },
    }).then((rel) => {
      if (rel?.coach.email) {
        return sendCoachCheckInEmail(rel.coach.email, rel.coach.name ?? '', mobile.name, mobile.id, {
          energyLevel: scale5to10(body.energyLevel),
          hardestRpe:  scale5to10(body.muscleSoreness),
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
      },
    })
  } catch (err) {
    console.error('[mobile/checkin] processCheckIn error:', err)
    return serverError()
  }
}
