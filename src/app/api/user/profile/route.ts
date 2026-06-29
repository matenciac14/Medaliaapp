import { NextResponse } from 'next/server'
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

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    dateOfBirth,
    weightKg, weightGoalKg, heightCm,
    hrResting, hrMax,
    sleepHoursAvg, injuries, conditions,
  } = body

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

  if (weightKg !== undefined && weightKg !== '')     data.weightKg     = parseFloat(weightKg)
  if (weightGoalKg !== undefined && weightGoalKg !== '') data.weightGoalKg = parseFloat(weightGoalKg)
  if (heightCm !== undefined && heightCm !== '')     data.heightCm     = parseFloat(heightCm)
  if (hrResting !== undefined && hrResting !== '')   data.hrResting    = parseInt(hrResting)
  if (hrMax !== undefined && hrMax !== '')           data.hrMax        = parseInt(hrMax)
  if (sleepHoursAvg !== undefined && sleepHoursAvg !== '') data.sleepHoursAvg = parseFloat(sleepHoursAvg)
  if (injuries !== undefined)   data.injuries   = injuries
  if (conditions !== undefined) data.conditions = conditions

  const profile = await prisma.healthProfile.update({
    where: { userId: session.user.id },
    data,
  })

  return NextResponse.json({
    ...profile,
    estimatedHrMax: profile.hrMax,
  })
}
