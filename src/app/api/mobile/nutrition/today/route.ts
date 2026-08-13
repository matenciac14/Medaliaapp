// NUT-14 — Unified mobile endpoint: everything the app needs for today's nutrition in one call.
// Replaces the need for 3 separate calls (/nutrition, /assigned-plan, /plan) but does NOT delete them.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { requireFeature } from '@/lib/guards/feature-gate'
import { jsToOurDow } from '@/lib/core/date-utils'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { intensityToDayType } from '@/lib/nutrition/day-type'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-today`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const todayDow = jsToOurDow(new Date().getDay())

  // Phase 1: active plan + current week (needed to resolve today's session)
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setHours(23, 59, 59, 999)

  // Phase 2: all parallel reads
  const [
    nutritionPlan,
    todaySession,
    assignedNutritionPlan,
    plannedMeals,
    foodLogs,
    pendingAdjustment,
    waterLog,
    gymToday,
  ] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),

    activePlan && currentWeek
      ? prisma.plannedSession.findFirst({
          where: { week: { planId: activePlan.id, weekNumber: currentWeek }, dayOfWeek: todayDow },
          select: { intensity: true, type: true },
        })
      : Promise.resolve(null),

    prisma.assignedNutritionPlan.findUnique({
      where: { athleteId: userId },
      include: {
        template: {
          select: {
            name: true,
            days: {
              include: {
                meals: {
                  orderBy: { order: 'asc' },
                  include: {
                    items: {
                      orderBy: { order: 'asc' },
                      include: { food: { select: { id: true, name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.plannedMeal.findMany({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
      include: {
        food: { select: { id: true, name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, servingG: true, servingLabel: true } },
      },
      orderBy: { mealType: 'asc' },
    }),

    prisma.foodLog.findMany({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
      include: {
        food: { select: { id: true, name: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } },
      },
      orderBy: { mealType: 'asc' },
    }),

    Promise.resolve(null), // DEPRECATED: PendingNutritionAdjustment ya no se genera

    prisma.waterLog.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { mlLogged: true },
    }),

    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: { template: { select: { days: { where: { dayOfWeek: todayDow }, select: { isRestDay: true } } } } },
    }),
  ])

  // Resolve today's intensity
  const hasGymToday = !!(gymToday?.template.days[0] && !gymToday.template.days[0].isRestDay)
  const sessionIntensity = todaySession?.intensity ?? (hasGymToday ? 'MODERATE' : null)
  const intensity = intensityToDayType(sessionIntensity)

  // Compute targets
  const targets = nutritionPlan
    ? getDailyNutritionTarget(sessionIntensity, nutritionPlan)
    : null

  // Resolve template meals for today's dayType (only if no specific plannedMeals)
  const dbDayType = sessionIntensity === 'HIGH' ? 'HARD' : sessionIntensity === 'REST' || !sessionIntensity ? 'REST' : 'EASY'
  const templateDay = assignedNutritionPlan?.template.days.find(d => d.dayType === dbDayType) ?? null
  const templateMeals = templateDay ? templateDay.meals : null

  // Compute adherence from today's food logs
  const kcalLogged = foodLogs.reduce((sum, log) => {
    const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
    return sum + kcal
  }, 0)

  const effectiveKcalTarget = targets?.kcal ?? 0
  const adherencePct = effectiveKcalTarget > 0 ? Math.round((kcalLogged / effectiveKcalTarget) * 100) : 0

  return NextResponse.json({
    targets,
    intensity,
    plannedMeals,
    templateMeals,
    foodLogs,
    adherence: {
      kcalLogged: Math.round(kcalLogged),
      kcalTarget: effectiveKcalTarget,
      pct: adherencePct,
    },
    adjustment: pendingAdjustment ?? null,
    waterMl: waterLog?.mlLogged ?? 0,
    waterTarget: nutritionPlan?.waterMlTarget ?? 2000,
  })
}
