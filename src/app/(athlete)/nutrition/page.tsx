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
import CoachNutritionProposalCard from './_components/CoachNutritionProposalCard'
import NutritionInitClient from './_components/NutritionInitClient'
import { CoachNutritionProposalRepository } from '@/infrastructure/db/coach-nutrition-proposal.repository'

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
  const weekStart = new Date(todayDate)
  weekStart.setDate(weekStart.getDate() - 6) // ultimos 7 dias
  weekStart.setHours(0, 0, 0, 0)

  const proposalRepo = new CoachNutritionProposalRepository(prisma)

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
    weekFoodLogs,
    coachProposals,
    currentPlanWeek,
    assignedNutritionPlan,
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
    prisma.foodLog.findMany({
      where: { userId, date: { gte: weekStart } },
      select: { date: true, kcalLogged: true, grams: true, food: { select: { kcalPer100g: true } } },
    }),
    proposalRepo.findPendingForAthlete(userId),
    activePlan && currentWeek
      ? prisma.planWeek.findFirst({
          where: { planId: activePlan.id, weekNumber: currentWeek },
          select: { isRecoveryWeek: true, sessions: { select: { intensity: true } } },
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
                      include: { food: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
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

  // Transformar plantilla del coach al formato canónico MealPlanData
  const MEAL_TYPE_LABELS: Record<string, string> = {
    BREAKFAST: 'Desayuno', LUNCH: 'Almuerzo', DINNER: 'Cena', SNACK: 'Snack',
  }
  type TemplateDayShape = NonNullable<typeof assignedNutritionPlan>['template']['days'][number]
  function templateDayToMeals(day: TemplateDayShape | undefined) {
    if (!day) return []
    return day.meals.map((m) => {
      const totals = m.items.reduce(
        (acc, i) => ({ kcal: acc.kcal + i.kcal, protein: acc.protein + i.proteinG, carbs: acc.carbs + i.carbsG, fat: acc.fat + i.fatG }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      )
      return {
        time: '',
        label: MEAL_TYPE_LABELS[m.mealType] ?? m.mealType,
        foods: m.items.map((i) => `${i.food.name} ${i.grams}g`).join(', '),
        items: m.items.map((i) => ({ name: i.food.name, g: i.grams, kcal: i.kcal, protein: i.proteinG, carbs: i.carbsG, fat: i.fatG })),
        ...totals,
      }
    })
  }
  const empty = { meals: [], supplements: [], hydrationL: 2, rules: [] }
  const assignedMealPlan: MealPlanData | null = assignedNutritionPlan
    ? {
        hard: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d) => d.dayType === 'HARD')) },
        easy: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d) => d.dayType === 'EASY')) },
        rest: { ...empty, meals: templateDayToMeals(assignedNutritionPlan.template.days.find((d) => d.dayType === 'REST')) },
      }
    : null

  const hasMealPlan = !!(assignedMealPlan ?? parsedMealPlan)
  const hasFoodProfile = !!foodProfile

  // Adherencia semanal — días donde kcal loggeada >= target * 0.9
  let weeklyAdherence: { daysHit: number; totalDays: number } | null = null
  if (nutritionPlanRaw && weekFoodLogs.length > 0) {
    const targetKcal = nutritionPlanRaw.targetKcalEasy ?? nutritionPlanRaw.targetKcalHard ?? 0
    if (targetKcal > 0) {
      const kcalByDay: Record<string, number> = {}
      for (const log of weekFoodLogs) {
        const day = log.date.toISOString().slice(0, 10)
        const kcal = log.kcalLogged ?? (log.grams / 100) * (log.food?.kcalPer100g ?? 0)
        kcalByDay[day] = (kcalByDay[day] ?? 0) + kcal
      }
      const loggedDays = Object.values(kcalByDay)
      const daysHit = loggedDays.filter((k) => k >= targetKcal * 0.9).length
      weeklyAdherence = { daysHit, totalDays: loggedDays.length }
    }
  }

  // Contexto de fase del plan
  let planPhaseText: string | null = null
  if (currentPlanWeek) {
    if (currentPlanWeek.isRecoveryWeek) {
      planPhaseText = 'Semana de descarga — prioriza proteína y descanso'
    } else {
      const intensities = currentPlanWeek.sessions.map((s) => s.intensity)
      const highCount = intensities.filter((i) => i === 'HIGH').length
      const medCount  = intensities.filter((i) => i === 'MODERATE').length
      if (highCount > intensities.length / 2) {
        planPhaseText = 'Semana de carga alta — maximiza carbohidratos'
      } else if (medCount >= intensities.length / 2) {
        planPhaseText = 'Semana de carga moderada — equilibra macros'
      }
    }
  }

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

      {/* Contexto de fase del plan */}
      {planPhaseText && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 font-medium">
          📅 {planPhaseText}
        </div>
      )}

      {/* Propuestas de ajuste del coach */}
      {coachProposals.map((p) => (
        <CoachNutritionProposalCard
          key={p.id}
          id={p.id}
          coachName={p.coach?.name ?? null}
          message={p.message}
          deltaKcal={p.deltaKcal}
          deltaProtein={p.deltaProtein}
          deltaCarbs={p.deltaCarbs}
          deltaFat={p.deltaFat}
        />
      ))}

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

      {/* Adherencia semanal */}
      {weeklyAdherence && weeklyAdherence.totalDays > 0 && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-lg">📊</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">
              Esta semana cumpliste tu meta <span style={{ color: weeklyAdherence.daysHit >= weeklyAdherence.totalDays * 0.7 ? '#16a34a' : weeklyAdherence.daysHit >= weeklyAdherence.totalDays * 0.4 ? '#d97706' : '#dc2626' }}>{weeklyAdherence.daysHit} de {weeklyAdherence.totalDays} días</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {weeklyAdherence.daysHit >= weeklyAdherence.totalDays * 0.8 ? '¡Excelente consistencia!' : weeklyAdherence.daysHit >= weeklyAdherence.totalDays * 0.5 ? 'Vas bien, sigue así.' : 'Registra más días para mejorar.'}
            </p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: weeklyAdherence.totalDays }, (_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: i < weeklyAdherence!.daysHit ? '#22c55e' : '#e5e7eb' }} />
            ))}
          </div>
        </div>
      )}

      {/* Contenido real — si hay meal plan completo (plan AI o plantilla del coach) */}
      {hasMealPlan && (assignedMealPlan ?? parsedMealPlan) && nutritionPlan && (
        <>
          {assignedNutritionPlan && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-sm text-indigo-800 font-medium">
              Plan de tu coach: {assignedNutritionPlan.template.name}
            </div>
          )}
          <NutritionContent
            mealPlan={(assignedMealPlan ?? parsedMealPlan) as unknown as MealPlanData}
            nutritionPlan={nutritionPlan}
            todayDayType={todayDayType}
          />
        </>
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
                { label: 'Grasas', value: todayFat, unit: 'g', color: 'text-green-600' },
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

      {/* Sin plan nutricional base — solo cuando onboarding está incompleto (no hay healthProfile) */}
      {!hasMealPlan && !nutritionPlan && !needsNutritionInit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
          Completa el onboarding para activar tu plan nutricional base.
        </div>
      )}
      {/* Init automático — dispara POST /api/nutrition/init si hay perfil pero falta el plan */}
      {needsNutritionInit && <NutritionInitClient />}

      {/* Guía de alimentos — solo cuando hay nutritionPlan (evita mostrar targets en 0) */}
      {allFoods.length > 0 && nutritionPlan && (
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
