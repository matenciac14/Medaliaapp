import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push'
import { getDailyNutritionTarget, type NutritionPlanTargets } from '@/lib/nutrition/daily-target'
import { getIntensityMapForDateRange } from '@/lib/nutrition/get-intensity-for-date'

// Cron: diario 09:00 UTC
// Coach recibe push si un atleta tiene adherencia nutricional < 60% tres días seguidos
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const now = new Date()

  const relationships = await prisma.coachAthlete.findMany({
    where: { status: 'ACTIVE' },
    select: {
      athlete: {
        select: {
          id: true,
          name: true,
          nutritionPlan: {
            select: {
              targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true,
              proteinG: true, carbsHardG: true, carbsEasyG: true, fatG: true,
            },
          },
          foodLogs: {
            where: { date: { gte: threeDaysAgo } },
            select: { date: true, kcalLogged: true, grams: true, food: { select: { kcalPer100g: true } } },
          },
        },
      },
      coach: { select: { pushToken: true } },
    },
  })

  let alerted = 0

  for (const rel of relationships) {
    const { athlete, coach } = rel
    if (!coach.pushToken) continue

    // Determinar targets: NutritionPlan directo o sintetizado desde template
    let effectiveTargets: NutritionPlanTargets | null = athlete.nutritionPlan
    if (!effectiveTargets) {
      const assigned = await prisma.assignedNutritionPlan.findUnique({
        where: { athleteId: athlete.id },
        include: {
          template: {
            select: {
              days: { include: { meals: { include: { items: true } } } },
            },
          },
        },
      })
      if (assigned) effectiveTargets = synthesizeTargetsFromTemplate(assigned)
    }
    if (!effectiveTargets) continue

    const intensityMap = await getIntensityMapForDateRange(athlete.id, threeDaysAgo, now)

    // Agrupar kcal por día
    const kcalByDay: Record<string, number> = {}
    for (const log of athlete.foodLogs) {
      const day = log.date.toISOString().slice(0, 10)
      const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
      kcalByDay[day] = (kcalByDay[day] ?? 0) + kcal
    }

    // Necesitamos exactamente 3 días con algún log Y todos < 60% del target del día
    const entries = Object.entries(kcalByDay)
    if (entries.length < 3) continue
    const allLow = entries.every(([date, kcal]) => {
      const intensity = intensityMap.get(date) ?? 'REST'
      const target = getDailyNutritionTarget(intensity, effectiveTargets!)
      return target.kcal > 0 && (kcal / target.kcal) < 0.6
    })
    if (!allLow) continue

    sendPushNotification(
      coach.pushToken,
      'Nutrición baja 🥗',
      `${athlete.name ?? 'Tu atleta'} lleva 3 días con menos del 60% de adherencia nutricional.`,
      { screen: 'coach' },
    ).catch(() => {})

    alerted++
  }

  return NextResponse.json({ alerted })
}

// Sintetiza NutritionPlanTargets desde los items del template asignado
function synthesizeTargetsFromTemplate(plan: {
  template: {
    days: Array<{
      dayType: string
      meals: Array<{
        items: Array<{ kcal: number; proteinG: number; carbsG: number; fatG: number }>
      }>
    }>
  }
}): NutritionPlanTargets {
  function sumDay(dayType: string) {
    const day = plan.template.days.find(d => d.dayType === dayType)
    if (!day) return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    let kcal = 0, proteinG = 0, carbsG = 0, fatG = 0
    for (const m of day.meals) {
      for (const i of m.items) {
        kcal += i.kcal; proteinG += i.proteinG; carbsG += i.carbsG; fatG += i.fatG
      }
    }
    return { kcal, proteinG, carbsG, fatG }
  }
  const hard = sumDay('HARD')
  const easy = sumDay('EASY')
  const rest = sumDay('REST')
  return {
    targetKcalHard: hard.kcal,
    targetKcalEasy: easy.kcal,
    targetKcalRest: rest.kcal,
    proteinG: easy.proteinG,
    carbsHardG: hard.carbsG,
    carbsEasyG: easy.carbsG,
    fatG: easy.fatG,
  }
}
