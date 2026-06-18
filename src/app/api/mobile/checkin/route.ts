import { NextRequest } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'
import { prisma } from '@/lib/db/prisma'
import { processCheckIn } from '@/domain/check-in/process-check-in.use-case'
import { PrismaCheckInRepository } from '@/infrastructure/db/check-in.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { PrismaHealthProfileRepository } from '@/infrastructure/db/health-profile.repository'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import { AnthropicService } from '@/infrastructure/ai/anthropic.service'
import { unauthorized, ok, serverError } from '@/lib/api/responses'

/** Mobile sends energy and stress on a 1-5 scale — normalize to 1-10 for consistency. */
function scale5to10(v: number): number {
  return Math.round(v * 2)
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return unauthorized()

  const body = await req.json() as {
    energyLevel: number      // 1-5
    muscleSoreness: number   // 1-5 → maps to rpe
    stressLevel: number      // 1-5
    motivationLevel?: number // 1-10
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
      },
    })
  } catch (err) {
    console.error('[mobile/checkin] processCheckIn error:', err)
    return serverError()
  }
}
