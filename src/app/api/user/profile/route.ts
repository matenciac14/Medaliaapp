import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { estimateHRMax } from '@/lib/plan/formulas'

function calcAge(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

const profilePatchSchema = z.object({
  dateOfBirth:  z.string().datetime({ offset: true }).optional(),
  weightKg:     z.number().min(20).max(500).optional(),
  weightGoalKg: z.number().min(20).max(500).optional(),
  heightCm:     z.number().min(50).max(300).optional(),
  hrResting:    z.number().int().min(30).max(120).optional(),
  hrMax:        z.number().int().min(100).max(250).optional(),
  sleepHoursAvg: z.number().min(1).max(24).optional(),
  injuries:     z.string().max(1000).optional(),
  conditions:   z.string().max(1000).optional(),
}).strict()

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = profilePatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const {
    dateOfBirth,
    weightKg, weightGoalKg, heightCm,
    hrResting, hrMax,
    sleepHoursAvg, injuries, conditions,
  } = parsed.data

  const data: Record<string, unknown> = {}

  // Si viene fecha de nacimiento → calcular edad automáticamente
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth)
    data.dateOfBirth = dob
    data.age = calcAge(dob)

    // Si no viene hrMax manual → estimar con la fórmula canónica (Fox: 211 - 0.64×edad)
    if (!hrMax) {
      data.hrMax = estimateHRMax(data.age as number)
    }
  }

  if (weightKg !== undefined)     data.weightKg     = weightKg
  if (weightGoalKg !== undefined) data.weightGoalKg = weightGoalKg
  if (heightCm !== undefined)     data.heightCm     = heightCm
  if (hrResting !== undefined)    data.hrResting    = hrResting
  if (hrMax !== undefined)        data.hrMax        = hrMax
  if (sleepHoursAvg !== undefined) data.sleepHoursAvg = sleepHoursAvg
  if (injuries !== undefined)     data.injuries     = injuries
  if (conditions !== undefined)   data.conditions   = conditions

  const profile = await prisma.healthProfile.update({
    where: { userId: session.user.id },
    data,
  })

  return NextResponse.json({
    ...profile,
    estimatedHrMax: profile.hrMax,
  })
}
