import { NextRequest, NextResponse } from 'next/server'
import { jsToOurDow } from '@/lib/core/date-utils'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { requireFeature } from '@/lib/guards/feature-gate'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { intensityToDayType } from '@/lib/nutrition/day-type'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'
import { parseMealPlanData } from '@/domain/nutrition/generate-meal-plan'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const todayDow = jsToOurDow(new Date().getDay())

  // Fetch plan first to compute current week — avoid date-based query (timezone-sensitive)
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [nutritionPlanRaw, mealPlan, todaySession, pendingAdj, gymToday, healthProfile] = await Promise.all([
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
    prisma.pendingNutritionAdjustment.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { id: true, deltaKcal: true, deltaCarbsG: true, adjustedKcal: true, adjustedCarbsG: true, plannedIntensity: true, actualIntensity: true, status: true },
    }),
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
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, age: true, gender: true, weightGoalKg: true },
    }),
  ])

  // PERSIST-09: GET no hace writes. El lazy-init fue eliminado para no violar REST
  // y evitar race conditions entre requests concurrentes. La inicialización del plan
  // nutricional ocurre en POST /api/onboarding/generate o POST /api/nutrition/generate.
  const nutritionPlan = nutritionPlanRaw

  const hasGymToday = !!(gymToday?.template.days[0] && !gymToday.template.days[0].isRestDay)
  const sessionIntensity = todaySession?.intensity ?? (hasGymToday ? 'HIGH' : null)
  const dayType = intensityToDayType(sessionIntensity)

  if (!nutritionPlan) {
    return NextResponse.json({ hasNutritionPlan: false, dayType, macros: null, mealPlan: null })
  }

  const dailyTarget = getDailyNutritionTarget(sessionIntensity, nutritionPlan)
  const macros = { kcal: dailyTarget.kcal, proteinG: dailyTarget.proteinG, carbsG: dailyTarget.carbsG, fatG: dailyTarget.fatG, tdee: nutritionPlan.tdee }

  const pendingAdjustment = pendingAdj?.status === 'PENDING' ? pendingAdj : null

  return NextResponse.json({
    hasNutritionPlan: true,
    dayType,
    macros,
    mealPlan: parseMealPlanData(mealPlan?.data ?? null),
    pendingAdjustment,
  })
}
