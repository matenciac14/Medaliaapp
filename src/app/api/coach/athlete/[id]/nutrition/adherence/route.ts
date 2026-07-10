import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const twentyEightDaysAgo = new Date()
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

  const [foodLogs, nutritionPlan] = await Promise.all([
    prisma.foodLog.findMany({
      where: { userId: athleteId, date: { gte: twentyEightDaysAgo } },
      select: { date: true, kcalLogged: true, grams: true, food: { select: { kcalPer100g: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.nutritionPlan.findUnique({
      where: { userId: athleteId },
      select: { targetKcalHard: true },
    }),
  ])

  const targetKcal = nutritionPlan?.targetKcalHard ?? null

  const kcalByDay: Record<string, number> = {}
  for (const log of foodLogs) {
    const day = log.date.toISOString().slice(0, 10)
    const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
    kcalByDay[day] = (kcalByDay[day] ?? 0) + kcal
  }

  const days = Object.entries(kcalByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, kcalLogged]) => ({
      date,
      kcalLogged: Math.round(kcalLogged),
      targetKcal,
      adherencePct: targetKcal ? Math.min(Math.round((kcalLogged / targetKcal) * 100), 999) : null,
    }))

  return NextResponse.json({ days, targetKcal })
}
