import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push'

// Cron: diario 09:00 UTC
// Coach recibe push si un atleta tiene adherencia nutricional < 60% tres días seguidos
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const relationships = await prisma.coachAthlete.findMany({
    where: { status: 'ACTIVE' },
    select: {
      athlete: {
        select: {
          id: true,
          name: true,
          nutritionPlan: { select: { targetKcalHard: true } },
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
    if (!athlete.nutritionPlan?.targetKcalHard || !coach.pushToken) continue

    const targetKcal = athlete.nutritionPlan.targetKcalHard

    // Agrupar por día
    const kcalByDay: Record<string, number> = {}
    for (const log of athlete.foodLogs) {
      const day = log.date.toISOString().slice(0, 10)
      const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
      kcalByDay[day] = (kcalByDay[day] ?? 0) + kcal
    }

    // Necesitamos exactamente 3 días con algún log Y todos < 60% del target
    const days = Object.values(kcalByDay)
    if (days.length < 3) continue
    const allLow = days.every((kcal) => kcal / targetKcal < 0.6)
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
