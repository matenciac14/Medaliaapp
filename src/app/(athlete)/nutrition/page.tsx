import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { jsToOurDow } from '@/lib/core/date-utils'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { intensityToDayType, type DayType } from '@/lib/nutrition/day-type'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'
import { parseMealPlanData } from '@/domain/nutrition/generate-meal-plan'
import NutritionContent, { type MealPlanData } from './_components/NutritionContent'
import FoodGuide from './_components/FoodGuide'
import TrackingSection from './_components/TrackingSection'
import NutritionAdjustmentCard from './_components/NutritionAdjustmentCard'
import CoachNutritionProposalCard from './_components/CoachNutritionProposalCard'
import NutritionInitClient from './_components/NutritionInitClient'
import WeeklyNutritionBars from './_components/WeeklyNutritionBars'
import WeeklyMenuStrip from './_components/WeeklyMenuStrip'
import ActivityCard from './_components/ActivityCard'
import MacroTargetCards from './_components/MacroTargetCards'
import HydrationWidget from './_components/HydrationWidget'
import MealSummaryCards from './_components/MealSummaryCards'
import TipCard from './_components/TipCard'
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

  // Semana actual Lun–Dom para PlannedMeals
  const mondayThisWeek = new Date(todayDate)
  const todayDowNum = todayDate.getDay() === 0 ? 7 : todayDate.getDay() // 1=Lun..7=Dom
  mondayThisWeek.setDate(todayDate.getDate() - (todayDowNum - 1))
  mondayThisWeek.setHours(0, 0, 0, 0)
  const sundayThisWeek = new Date(mondayThisWeek)
  sundayThisWeek.setDate(mondayThisWeek.getDate() + 6)
  sundayThisWeek.setHours(23, 59, 59, 999)

  const proposalRepo = new CoachNutritionProposalRepository(prisma)

  // Cargar datos en paralelo — una sola ronda
  const [
    pendingAdjustment,
    nutritionPlanRaw,
    mealPlan,
    todaySession,
    gymToday,
    healthProfile,
    allFoods,
    weekFoodLogs,
    coachProposals,
    currentPlanWeek,
    assignedNutritionPlan,
    weekSessions,
    athleteTemplate,
    plannedMealsThisWeek,
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
    activePlan && currentWeek
      ? prisma.plannedSession.findFirst({
          where: {
            week: { planId: activePlan.id, weekNumber: currentWeek },
            dayOfWeek: todayDow,
          },
          select: { intensity: true, type: true, durationMin: true },
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
    // NUT-F-02: sesiones de la semana actual (para mapear dayType por día)
    activePlan && currentWeek
      ? prisma.plannedSession.findMany({
          where: { week: { planId: activePlan.id, weekNumber: currentWeek } },
          select: { dayOfWeek: true, intensity: true, type: true },
        })
      : Promise.resolve([]),
    // NUT-FLOW-01: plantilla de nutrición propia del atleta B2C
    prisma.nutritionTemplate.findFirst({
      where: { athleteId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
    }),
    // NUT-FLOW-01 + NUT-DASH-04: PlannedMeals semana con datos de alimento
    prisma.plannedMeal.findMany({
      where: { userId, date: { gte: mondayThisWeek, lte: sundayThisWeek } },
      select: {
        id: true,
        mealType: true,
        grams: true,
        date: true,
        food: { select: { name: true, kcalPer100g: true } },
      },
      orderBy: { date: 'asc' },
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

  // UX-NUT-01: cuando el atleta B2B tiene plan del coach pero no tiene NutritionPlan,
  // calcular targets desde los ítems de la plantilla para evitar macros en 0.
  function sumTemplateDayMacros(plan: NonNullable<typeof assignedNutritionPlan>, dbDayType: 'HARD' | 'EASY' | 'REST') {
    const day = plan.template.days.find((d) => d.dayType === dbDayType)
    if (!day) return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    let kcal = 0, proteinG = 0, carbsG = 0, fatG = 0
    for (const m of day.meals) {
      for (const i of m.items) {
        kcal += i.kcal; proteinG += i.proteinG; carbsG += i.carbsG; fatG += i.fatG
      }
    }
    return { kcal, proteinG, carbsG, fatG }
  }
  const syntheticNutritionPlan = !nutritionPlan && assignedNutritionPlan
    ? (() => {
        const hard = sumTemplateDayMacros(assignedNutritionPlan, 'HARD')
        const easy = sumTemplateDayMacros(assignedNutritionPlan, 'EASY')
        const rest = sumTemplateDayMacros(assignedNutritionPlan, 'REST')
        return {
          tdee: easy.kcal,
          targetKcalHard: hard.kcal,
          targetKcalEasy: easy.kcal,
          targetKcalRest: rest.kcal,
          proteinG: easy.proteinG,
          carbsHardG: hard.carbsG,
          carbsEasyG: easy.carbsG,
          fatG: easy.fatG,
        }
      })()
    : null
  const effectiveNutritionPlan = nutritionPlan ?? syntheticNutritionPlan
  const hasPlannedMealsThisWeek = plannedMealsThisWeek.length > 0

  // NUT-DASH-04: comidas de HOY (filtramos del array semanal ya cargado)
  const todayStr = todayDate.toISOString().split('T')[0]
  const todayPlannedMeals = plannedMealsThisWeek.filter(m => {
    const d = m.date instanceof Date ? m.date : new Date(m.date)
    return d.toISOString().split('T')[0] === todayStr
  })

  // Adherencia semanal — días donde kcal loggeada >= target * 0.9
  let weeklyAdherence: { daysHit: number; totalDays: number } | null = null
  const kcalByDay: Record<string, number> = {}
  if (nutritionPlanRaw && weekFoodLogs.length > 0) {
    const targetKcal = nutritionPlanRaw.targetKcalEasy ?? nutritionPlanRaw.targetKcalHard ?? 0
    if (targetKcal > 0) {
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

  // NUT-F-03: datos de barras de adherencia para los últimos 7 días
  const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const targetKcalForBars = nutritionPlanRaw
    ? (nutritionPlanRaw.targetKcalEasy ?? nutritionPlanRaw.targetKcalHard ?? 0)
    : (syntheticNutritionPlan?.targetKcalEasy ?? 0)
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate)
    d.setDate(d.getDate() - 6 + i)
    const key = d.toISOString().slice(0, 10)
    const kcal = kcalByDay[key] ?? null
    const pct = (kcal !== null && targetKcalForBars > 0)
      ? Math.round((kcal / targetKcalForBars) * 100)
      : null
    return {
      label: DOW_LABELS[d.getDay()],
      pct,
      isToday: key === todayDate.toISOString().slice(0, 10),
    }
  })

  // NUT-F-02: datos del menú semanal (días de la semana con dayType del plan)
  const weekMenuDays = Array.from({ length: 7 }, (_, i) => {
    const dow = i  // 0=Lun..6=Dom (nuestro sistema: jsToOurDow offset)
    const session = weekSessions.find(s => s.dayOfWeek === dow)
    const dayType = session && session.type !== 'DESCANSO'
      ? intensityToDayType(session.intensity)
      : 'rest'
    // Fecha real del día
    const todayMonday = new Date(todayDate)
    const todayDowNum = todayDate.getDay() === 0 ? 7 : todayDate.getDay()  // 1=Lun
    todayMonday.setDate(todayDate.getDate() - (todayDowNum - 1))
    const dayDate = new Date(todayMonday)
    dayDate.setDate(todayMonday.getDate() + i)
    const MONTH_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return {
      label: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i],
      date: `${dayDate.getDate()} ${MONTH_SHORT[dayDate.getMonth()]}`,
      dayType: (weekSessions.length > 0 ? dayType : null) as 'hard' | 'easy' | 'rest' | null,
      isToday: dow === todayDow,
      hasSession: !!session && session.type !== 'DESCANSO',
    }
  })

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
  const nt = effectiveNutritionPlan ? getDailyNutritionTarget(todayIntensity, effectiveNutritionPlan) : null
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

      {/* NUT-DASH-01 — Sesión del día */}
      {(todaySession || hasGymSessionToday) && (
        <ActivityCard
          sessionType={todaySession?.type ?? null}
          intensity={todaySession?.intensity ?? null}
          durationMin={todaySession?.durationMin ?? null}
          isGymDay={hasGymSessionToday}
        />
      )}

      {/* NUT-DASH-02 — Targets del día (siempre visibles con plan nutricional) */}
      {effectiveNutritionPlan && (todayKcal > 0 || todayProtein > 0) && (
        <MacroTargetCards
          kcal={todayKcal}
          proteinG={todayProtein}
          carbsG={todayCarbs}
          fatG={todayFat}
        />
      )}

      {/* Tracking hero — Lo que comí hoy (primer elemento visible) */}
      {effectiveNutritionPlan && allFoods.length > 0 && (
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

      {/* NUT-F-03 — Adherencia calórica semanal (barras) */}
      {effectiveNutritionPlan && (
        <WeeklyNutritionBars days={weekBars} />
      )}

      {/* NUT-F-02 — Menú semanal (solo si hay plan activo + meal plan) */}
      {activePlan && hasMealPlan && (assignedMealPlan ?? parsedMealPlan) && (
        <WeeklyMenuStrip
          days={weekMenuDays}
          mealPlan={(assignedMealPlan ?? parsedMealPlan) as unknown as Parameters<typeof WeeklyMenuStrip>[0]['mealPlan']}
        />
      )}

      {/* Contenido real — si hay meal plan completo (plan AI o plantilla del coach) */}
      {hasMealPlan && (assignedMealPlan ?? parsedMealPlan) && effectiveNutritionPlan && (
        <>
          {assignedNutritionPlan && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-sm text-indigo-800 font-medium">
              Plan de tu coach: {assignedNutritionPlan.template.name}
            </div>
          )}
          <NutritionContent
            mealPlan={(assignedMealPlan ?? parsedMealPlan) as unknown as MealPlanData}
            nutritionPlan={effectiveNutritionPlan}
            todayDayType={todayDayType}
          />
        </>
      )}

      {/* Plan en DB pero datos inválidos — CTA a recrear plantilla */}
      {mealPlan && !parsedMealPlan && nutritionPlan && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">Tu plan de comidas necesita actualizarse</p>
          <p className="text-xs text-yellow-600 mb-3">El formato anterior no es compatible. Crea una nueva plantilla.</p>
          <Link href="/nutrition/builder" className="inline-block text-xs font-bold text-white bg-[#1e3a5f] px-4 py-2 rounded-lg hover:bg-[#162d4a] transition-colors">
            Crear plantilla →
          </Link>
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

          {/* NUT-FLOW-01 — CTA dinámico según estado del atleta B2C */}
          {!assignedNutritionPlan && (
            !athleteTemplate ? (
              // (a) Sin plantilla → invitar a crear Constructor A
              <div className="bg-[#1e3a5f]/4 border border-[#1e3a5f]/15 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#1e3a5f]">Configura tu plan de comidas</p>
                  <p className="text-xs text-gray-500 mt-0.5">Diseña tu menú tipo para días duros, fáciles y de descanso.</p>
                </div>
                <Link
                  href="/nutrition/builder"
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#1e3a5f' }}
                >
                  Crear plantilla →
                </Link>
              </div>
            ) : !hasPlannedMealsThisWeek ? (
              // (b) Con plantilla, sin plan esta semana → invitar a Constructor B
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-orange-800">Planifica esta semana</p>
                  <p className="text-xs text-orange-600 mt-0.5">Tu plantilla <strong>{athleteTemplate.name}</strong> está lista — asigna comidas a cada día.</p>
                </div>
                <Link
                  href={`/nutrition/builder/${athleteTemplate.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#ea580c' }}
                >
                  Planificar semana →
                </Link>
              </div>
            ) : (
              // (c) Con plan semanal activo → cards de hoy + CTA planificador
              <>
                {todayPlannedMeals.length > 0 ? (
                  <MealSummaryCards meals={todayPlannedMeals} />
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-green-800">Tu plan semanal está activo</p>
                      <p className="text-xs text-green-600 mt-0.5">{plannedMealsThisWeek.length} comidas planificadas esta semana — revisa o ajusta tu menú.</p>
                    </div>
                    <Link
                      href="/nutrition/planner"
                      className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#22c35d' }}
                    >
                      Ver plan →
                    </Link>
                  </div>
                )}
              </>
            )
          )}
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

      {/* NUT-DASH-06 — Consejo contextual según tipo de día */}
      {effectiveNutritionPlan && todayDayType && <TipCard dayType={todayDayType} />}

      {/* NUT-WATER-01 — Widget de hidratación */}
      {effectiveNutritionPlan && <HydrationWidget />}

      {/* Guía de alimentos — solo cuando hay effectiveNutritionPlan (evita mostrar targets en 0) */}
      {allFoods.length > 0 && effectiveNutritionPlan && (
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Guía de alimentos</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
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
