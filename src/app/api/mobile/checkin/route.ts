import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { processCheckIn } from '@/domain/check-in/process-check-in.use-case'
import { PrismaCheckInRepository } from '@/infrastructure/db/check-in.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { unauthorized, ok, serverError } from '@/lib/api/responses'
import { getPlanWeekNumber, getCurrentISOWeek } from '@/lib/core/week-number'

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

  const body = await req.json() as {
    energyLevel: number      // 1-5
    muscleSoreness: number   // 1-5 → maps to rpe
    stressLevel: number      // 1-5
    motivationLevel?: number // 1-10
    sleepScore?: number      // 1-10
    painLevel?: number       // 1-10
    weightKg?: number
    hrResting?: number
    sleepHours?: number
    notes?: string
  }

  try {
    const result = await processCheckIn(
      {
        userId: mobile.id,
        data: {
          rpe: scale5to10(body.muscleSoreness),
          sleepHours: body.sleepHours ?? 7,
          sleepScore: body.sleepScore,
          energyLevel: scale5to10(body.energyLevel),
          stressLevel: scale5to10(body.stressLevel),
          weight: body.weightKg,
          heartRate: body.hrResting,
          painLevel: body.painLevel,
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
