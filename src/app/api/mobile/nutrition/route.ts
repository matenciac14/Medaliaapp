import { NextRequest, NextResponse } from 'next/server'
import { jsToOurDow } from '@/lib/core/date-utils'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { intensityToDayType } from '@/lib/nutrition/day-type'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const userId = mobile.id
  const todayDow = jsToOurDow(new Date().getDay())

  // Fetch plan first to compute current week — avoid date-based query (timezone-sensitive)
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  const [nutritionPlan, mealPlan, todaySession, gymToday] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.mealPlan.findUnique({ where: { userId } }),
    activePlan && currentWeek
      ? prisma.plannedSession.findFirst({
          where: {
            week: { planId: activePlan.id, weekNumber: currentWeek },
            dayOfWeek: todayDow,
          },
          select: { type: true, intensity: true },
        })
      : Promise.resolve(null),
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: {
        template: {
          select: {
            days: {
              where: { dayOfWeek: todayDow },
              select: { isRestDay: true },
            },
          },
        },
      },
    }),
  ])

  const hasGymToday = !!(gymToday?.template.days[0] && !gymToday.template.days[0].isRestDay)
  const sessionIntensity = todaySession?.intensity ?? (hasGymToday ? 'HIGH' : null)
  const dayType = intensityToDayType(sessionIntensity)

  if (!nutritionPlan) {
    return NextResponse.json({ hasNutritionPlan: false, dayType, macros: null, mealPlan: null })
  }

  const kcal =
    dayType === 'hard' ? nutritionPlan.targetKcalHard
    : dayType === 'rest' ? nutritionPlan.targetKcalRest
    : dayType === 'low'  ? Math.round(nutritionPlan.targetKcalEasy * 0.88)
    : nutritionPlan.targetKcalEasy
  const carbsG =
    dayType === 'hard' ? nutritionPlan.carbsHardG
    : dayType === 'rest' ? Math.round(nutritionPlan.carbsEasyG * 0.7)
    : dayType === 'low'  ? Math.round(nutritionPlan.carbsEasyG * 0.75)
    : nutritionPlan.carbsEasyG
  const macros = { kcal, proteinG: nutritionPlan.proteinG, carbsG, fatG: nutritionPlan.fatG, tdee: nutritionPlan.tdee }

  return NextResponse.json({
    hasNutritionPlan: true,
    dayType,
    macros,
    mealPlan: mealPlan?.data ?? null,
  })
}
