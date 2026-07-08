import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { jsToOurDow } from '@/lib/core/date-utils'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { intensityToDayType, type DayType } from '@/lib/nutrition/day-type'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'
import { parseMealPlanData } from '@/domain/nutrition/generate-meal-plan'
import FoodSetupFlow from './_components/FoodSetupFlow'
import NutritionContent, { type MealPlanData } from './_components/NutritionContent'
import FoodGuide from './_components/FoodGuide'
import TrackingSection from './_components/TrackingSection'
import NutritionAdjustmentCard from './_components/NutritionAdjustmentCard'
import NutritionInitClient from './_components/NutritionInitClient'

export default async function NutritionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  // Fetch plan activo + timezone del usuario en paralelo
  const [activePlan, userRecord] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, startDate: true, totalWeeks: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ])
  const tz = userRecord?.timezone ?? 'America/Bogota'
  const todayDate = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  const todayDow = jsToOurDow(todayDate.getDay())
  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : null

  // Ajuste nutricional pendiente para hoy (date es @db.Date — comparar por día completo)
  const todayStart = new Date(todayDate)
  todayStart.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  // Cargar datos en paralelo — una sola ronda
  const [
    pendingAdjustment,
    nutritionPlanRaw,
    mealPlan,
    foodProfile,
    todaySession,
    gymToday,
    healthProfile,
    allFoods,
  ] = await Promise.all([
    prisma.pendingNutritionAdjustment.findFirst({
      where: { userId, status: 'PENDING', date: { gte: todayStart, lt: tomorrow } },
      select: {
        id: true,
        deltaKcal: true,
        deltaCarbsG: true,
        plannedKcal: true,
        adjustedKcal: true,
        plannedCarbsG: true,
        adjustedCarbsG: true,
        plannedIntensity: true,
        actualIntensity: true,
      },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.mealPlan.findUnique({ where: { userId } }),
    prisma.foodProfile.findUnique({ where: { userId } }),
    activePlan && currentWeek
      ? prisma.plannedSession.findFirst({
          where: {
            week: { planId: activePlan.id, weekNumber: currentWeek },
            dayOfWeek: todayDow,
          },
          select: { intensity: true },
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
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, age: true, gender: true, weightGoalKg: true },
    }),
    prisma.food.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 100,
      select: {
        id: true, name: true, category: true,
        kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
        fiberPer100g: true, calciumMg: true, ironMg: true,
        potassiumMg: true, vitaminCMg: true, magnesiumMg: true,
        servingG: true, servingLabel: true,
      },
    }),
  ])

  // Sin lazy-init: no se escribe a DB durante el render (violación REST, race conditions).
  // Si falta NutritionPlan, NutritionInitClient lo crea vía POST /api/nutrition/init y refresca.
  const nutritionPlan = nutritionPlanRaw
  const needsNutritionInit = !nutritionPlan && !!healthProfile?.weightKg && !!healthProfile?.heightCm && !!healthProfile?.age

  const gymDayToday = gymToday?.template.days[0]
  const hasGymSessionToday = !!gymDayToday && !gymDayToday.isRestDay

  const todayDayType: DayType = todaySession
    ? intensityToDayType(todaySession.intensity)
    : hasGymSessionToday
      ? 'hard'
      : 'rest'

  const DAY_TYPE_LABELS = {
    hard: { label: 'Día duro',   emoji: '🔥', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    easy: { label: 'Día fácil',  emoji: '✅', color: 'bg-green-100 text-green-700 border-green-200' },
    low:  { label: 'Día suave',  emoji: '🟣', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    rest: { label: 'Descanso',   emoji: '😴', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  }
  const badge = DAY_TYPE_LABELS[todayDayType]

  const parsedMealPlan = mealPlan ? parseMealPlanData(mealPlan.data) : null
  const hasMealPlan = !!parsedMealPlan
  const hasFoodProfile = !!foodProfile

  // Targets del día — fuente única de verdad: getDailyNutritionTarget
  const todayIntensity = (todaySession?.intensity as string | null)
    ?? (hasGymSessionToday ? 'MODERATE' : null)
  const nt = nutritionPlan ? getDailyNutritionTarget(todayIntensity, nutritionPlan) : null
  const todayKcal    = nt?.kcal ?? 0
  const todayCarbs   = nt?.carbsG ?? 0
  const todayProtein = nt?.proteinG ?? 0
  const todayFat     = nt?.fatG ?? 0

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-6">

      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        ← Volver al inicio
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nutrición de hoy</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plan personalizado según tu sesión</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${badge.color}`}>
          {badge.emoji} {badge.label}
        </span>
      </div>

      {/* Ajuste nutricional pendiente */}
      {pendingAdjustment && (
        <NutritionAdjustmentCard
          id={pendingAdjustment.id}
          deltaKcal={pendingAdjustment.deltaKcal}
          deltaCarbsG={pendingAdjustment.deltaCarbsG}
          plannedKcal={pendingAdjustment.plannedKcal}
          adjustedKcal={pendingAdjustment.adjustedKcal}
          plannedCarbsG={pendingAdjustment.plannedCarbsG}
          adjustedCarbsG={pendingAdjustment.adjustedCarbsG}
          plannedIntensity={pendingAdjustment.plannedIntensity}
          actualIntensity={pendingAdjustment.actualIntensity}
        />
      )}

      {/* Tracking hero — Lo que comí hoy (primer elemento visible) */}
      {nutritionPlan && allFoods.length > 0 && (
        <TrackingSection
          target={{
            kcal:     todayKcal,
            proteinG: todayProtein,
            carbsG:   todayCarbs,
            fatG:     todayFat,
          }}
          foods={allFoods}
        />
      )}

      {/* Contenido real — si hay meal plan completo */}
      {hasMealPlan && parsedMealPlan && nutritionPlan && (
        <NutritionContent
          mealPlan={parsedMealPlan as unknown as MealPlanData}
          nutritionPlan={nutritionPlan}
          todayDayType={todayDayType}
        />
      )}

      {/* Plan en DB pero datos inválidos — mostrar aviso con CTA a regenerar */}
      {mealPlan && !parsedMealPlan && nutritionPlan && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">Tu plan de comidas necesita actualizarse</p>
          <p className="text-xs text-yellow-600 mb-3">El formato del plan anterior no es compatible. Genera uno nuevo.</p>
          <FoodSetupFlow hasFoodProfile={hasFoodProfile} allFoods={allFoods} />
        </div>
      )}

      {/* Macros rápidos — cuando hay nutritionPlan pero aún no meal plan */}
      {!hasMealPlan && !mealPlan && nutritionPlan && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Tus macros de hoy</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Calorías', value: todayKcal, unit: 'kcal', color: 'text-[#ea580c]' },
                { label: 'Proteína', value: nutritionPlan.proteinG, unit: 'g', color: 'text-blue-600' },
                { label: 'Carbohidratos', value: todayCarbs, unit: 'g', color: 'text-yellow-600' },
                { label: 'Grasas', value: nutritionPlan.fatG, unit: 'g', color: 'text-green-600' },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                  <p className={`text-xl font-bold ${m.color}`}>{m.value}<span className="text-xs font-normal text-gray-400 ml-1">{m.unit}</span></p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">TDEE base: {nutritionPlan.tdee} kcal · Ajustado según intensidad del día</p>
          </div>

          {/* Setup opcional */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">¿Quieres un plan de comidas detallado?</p>
            <p className="text-xs text-blue-600 mb-3">Completa tu perfil alimenticio para recibir un plan con comidas específicas y suplementación.</p>
            <FoodSetupFlow hasFoodProfile={hasFoodProfile} allFoods={allFoods} />
          </div>
        </div>
      )}

      {/* Sin plan nutricional base */}
      {!hasMealPlan && !nutritionPlan && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
          Completa el onboarding para activar tu plan nutricional base.
        </div>
      )}
      {/* Init automático — dispara POST /api/nutrition/init si hay perfil pero falta el plan */}
      {needsNutritionInit && <NutritionInitClient />}

      {/* Guía de alimentos — siempre visible si hay alimentos en la librería */}
      {allFoods.length > 0 && (
        <div className="pt-2">
          <FoodGuide
            foods={allFoods}
            proteinTarget={todayProtein}
            carbsTarget={todayCarbs}
            fatTarget={todayFat}
            kcalTarget={todayKcal}
          />
        </div>
      )}
    </div>
  )
}
