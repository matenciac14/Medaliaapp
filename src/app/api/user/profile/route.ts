import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    weightKg, weightGoalKg, heightCm, age,
    hrResting, hrMax, sleepHoursAvg,
    injuries, conditions,
  } = body

  const data: Record<string, unknown> = {}
  if (weightKg !== undefined)     data.weightKg     = parseFloat(weightKg)
  if (weightGoalKg !== undefined) data.weightGoalKg = weightGoalKg ? parseFloat(weightGoalKg) : null
  if (heightCm !== undefined)     data.heightCm     = parseFloat(heightCm)
  if (age !== undefined)          data.age          = parseInt(age)
  if (hrResting !== undefined)    data.hrResting    = hrResting ? parseInt(hrResting) : null
  if (hrMax !== undefined)        data.hrMax        = hrMax ? parseInt(hrMax) : null
  if (sleepHoursAvg !== undefined) data.sleepHoursAvg = sleepHoursAvg ? parseFloat(sleepHoursAvg) : null
  if (injuries !== undefined)     data.injuries     = injuries
  if (conditions !== undefined)   data.conditions   = conditions

  const profile = await prisma.healthProfile.update({
    where: { userId: session.user.id },
    data,
  })

  return NextResponse.json(profile)
}
