// NUT-14 — Unified mobile endpoint: everything the app needs for today's nutrition in one call.
// After unification, this is the ONLY endpoint the nutrition tab fetches on mount.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'
import { todayDowInTz, todayInTz, getWeekMonday } from '@/lib/core/date_utils'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { intensityToDayType } from '@/lib/nutrition/day_type'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily_target'
import { parseMealPlanData } from '@/domain/nutrition/generate_meal_plan'
import { buildFoodLogResponse } from '@/domain/nutrition/calculate_food_log'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food_proposal.repository'

const proposalRepo = new PrismaFoodProposalRepository()

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-today`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const tz = req.nextUrl.searchParams.get('tz') || undefined
  const todayDow = todayDowInTz(tz)

  // Phase 1: active plan + current week
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, startDate: true, totalWeeks: true },
  })
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  const todayStart = todayInTz(tz)
  const todayEnd = new Date(todayStart.getTime() + 86_399_999)

  // Week bounds for weekly summary
  const weekMonday = getWeekMonday(0, tz)
  const weekSunday = new Date(weekMonday)
  weekSunday.setUTCDate(weekMonday.getUTCDate() + 6)
  weekSunday.setUTCHours(23, 59, 59, 999)

  // Phase 2: all parallel reads
  const [
    nutritionPlan,
    mealPlanRow,
    todaySession,
    assignedNutritionPlan,
    plannedMeals,
    foodLogs,
    waterLog,
    gymToday,
    gymSessionToday,
    currentPlanWeek,
    healthProfile,
    proposals,
    weekFoodLogs,
  ] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),

    prisma.mealPlan.findUnique({ where: { userId } }),

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
        overrides: {
          where: { athleteId: userId },
          select: {
            overrideFoodId: true, overrideGrams: true,
            overrideFood: { select: { id: true, name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, servingG: true, servingLabel: true } },
          },
          take: 1,
        },
      },
      orderBy: { mealType: 'asc' },
    }),

    prisma.foodLog.findMany({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
      include: {
        food: { select: { id: true, name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, servingG: true, servingLabel: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),

    prisma.waterLog.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { mlLogged: true },
    }),

    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: { template: { select: { days: { where: { dayOfWeek: todayDow }, select: { isRestDay: true } } } } },
    }),

    // Gym calories burned today
    prisma.gymSession.findFirst({
      where: { athleteId: userId, date: { gte: todayStart }, completed: true },
      select: { caloriesBurned: true },
      orderBy: { createdAt: 'desc' },
    }),

    // Plan phase context
    activePlan && currentWeek
      ? prisma.planWeek.findFirst({
          where: { planId: activePlan.id, weekNumber: currentWeek },
          select: { isRecoveryWeek: true, sessions: { select: { intensity: true } } },
        })
      : Promise.resolve(null),

    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, age: true, gender: true, weightGoalKg: true },
    }),

    // Food proposals
    proposalRepo.listByUser(userId),

    // Week food logs for weekly summary
    prisma.foodLog.findMany({
      where: { userId, date: { gte: weekMonday, lte: weekSunday } },
      include: { food: { select: { kcalPer100g: true } } },
    }),
  ])

  // Resolve today's intensity
  const hasGymToday = !!(gymToday?.template.days[0] && !gymToday.template.days[0].isRestDay)
  const sessionIntensity = todaySession?.intensity ?? (hasGymToday ? 'MODERATE' : null)
  const intensity = intensityToDayType(sessionIntensity)

  // Compute targets
  const targets = nutritionPlan ? getDailyNutritionTarget(sessionIntensity, nutritionPlan) : null

  // Resolve template meals for today's dayType
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

  // Build food log response (totals, pct, etc.)
  const todayDateStr = todayStart.toISOString().split('T')[0]
  const foodLogResponse = buildFoodLogResponse(foodLogs, nutritionPlan, sessionIntensity, todayDateStr)

  // Plan phase context
  const planPhaseContext = currentPlanWeek?.isRecoveryWeek
    ? 'Semana de descarga'
    : currentPlanWeek?.sessions.some(s => s.intensity === 'HIGH')
      ? 'Semana de carga alta'
      : currentPlanWeek?.sessions.some(s => s.intensity === 'MODERATE')
        ? 'Semana de carga media'
        : null

  const gymKcalBurned = gymSessionToday?.caloriesBurned ?? null

  // Planned meals with override flattened
  const plannedMealsFlat = plannedMeals.map(({ overrides, ...meal }) => ({
    ...meal,
    override: overrides[0] ?? null,
  }))

  // Weekly summary computation (timezone-aware)
  const kcalByDay = new Map<string, number>()
  for (const log of weekFoodLogs) {
    const dateKey = log.date.toISOString().split('T')[0]
    const kcal = log.kcalLogged != null ? Math.round(log.kcalLogged) : Math.round((log.food.kcalPer100g * log.grams) / 100)
    kcalByDay.set(dateKey, (kcalByDay.get(dateKey) ?? 0) + kcal)
  }
  const daysWithLog = kcalByDay.size
  const totalKcal = [...kcalByDay.values()].reduce((a, b) => a + b, 0)
  const avgKcal = daysWithLog > 0 ? Math.round(totalKcal / daysWithLog) : 0

  let weeklyAdherencePct: number | null = null
  if (nutritionPlan && daysWithLog > 0) {
    // Fetch intensity per day for the week
    let intensityByDate = new Map<string, string>()
    if (activePlan) {
      const plannedSessions = await prisma.plannedSession.findMany({
        where: { week: { planId: activePlan.id }, date: { gte: weekMonday, lte: weekSunday } },
        select: { date: true, intensity: true },
      })
      for (const s of plannedSessions) {
        intensityByDate.set(s.date.toISOString().split('T')[0], s.intensity)
      }
    }
    let totalAdherence = 0
    for (const [dateKey, consumed] of kcalByDay) {
      const dayIntensity = intensityByDate.get(dateKey) ?? null
      const target = getDailyNutritionTarget(dayIntensity, nutritionPlan)
      if (target.kcal > 0) totalAdherence += (consumed / target.kcal) * 100
    }
    weeklyAdherencePct = Math.round(totalAdherence / daysWithLog)
  }

  const weeklySummary = {
    weekStart: weekMonday.toISOString().split('T')[0],
    weekEnd: weekSunday.toISOString().split('T')[0],
    daysWithLog,
    daysWithoutLog: 7 - daysWithLog,
    avgKcal,
    targetKcal: nutritionPlan?.targetKcalEasy ?? 0,
    adherencePct: weeklyAdherencePct,
  }

  // Macros with tdee (for backward compat with NutritionData type)
  const macros = targets
    ? { kcal: targets.kcal, proteinG: targets.proteinG, carbsG: targets.carbsG, fatG: targets.fatG, tdee: nutritionPlan!.tdee }
    : null

  return NextResponse.json({
    // Core nutrition state
    hasNutritionPlan: !!nutritionPlan,
    dayType: intensity,
    macros,
    targets,
    intensity,

    // Today's data
    plannedMeals: plannedMealsFlat,
    templateMeals,
    foodLogs: foodLogResponse,
    adherence: {
      kcalLogged: Math.round(kcalLogged),
      kcalTarget: effectiveKcalTarget,
      pct: adherencePct,
    },

    // Water
    waterMl: waterLog?.mlLogged ?? 0,
    waterTarget: nutritionPlan?.waterMlTarget ?? 2000,

    // Meal plan (static JSON)
    mealPlan: parseMealPlanData(mealPlanRow?.data ?? null),

    // Context
    gymKcalBurned,
    planPhaseContext,
    pendingAdjustment: null,

    // Proposals
    proposals: proposals.map(p => ({
      id: p.id,
      status: p.status,
      food: { id: p.foodId ?? p.id, name: p.name, kcalPer100g: p.kcalPer100g, proteinPer100g: p.proteinPer100g, carbsPer100g: p.carbsPer100g, fatPer100g: p.fatPer100g },
      reviewNote: p.reviewNote,
      country: p.country,
      notes: p.notes,
      createdAt: p.createdAt,
    })),

    // Weekly summary
    weeklySummary,
  })
}
