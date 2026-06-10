import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import FoodSetupFlow from './_components/FoodSetupFlow'
import NutritionContent from './_components/NutritionContent'
import FoodGuide from './_components/FoodGuide'

type DayType = 'hard' | 'easy' | 'rest'

function getDayType(sessionType: string): DayType {
  if (sessionType === 'DESCANSO') return 'rest'
  if (['FARTLEK', 'TIRADA_LARGA', 'NATACION', 'FUERZA', 'INTERVALOS', 'TEMPO'].includes(sessionType)) return 'hard'
  return 'easy'
}

function jsToOurDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

export default async function NutritionPage() {
  const session = await auth()

  if (!session?.user?.features?.nutrition) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6">
          ← Volver al inicio
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">🥗</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nutrición personalizada</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            El plan nutricional con macros adaptados a tus sesiones está disponible en el plan Pro.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Ver planes → Pro $15/mes
          </Link>
        </div>
      </div>
    )
  }

  const userId = session?.user?.id
  if (!userId) return null

  const todayDow = jsToOurDow(new Date().getDay())

  // Cargar datos en paralelo
  const [nutritionPlan, mealPlan, foodProfile, todaySession, gymToday, allFoods] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.mealPlan.findUnique({ where: { userId } }),
    prisma.foodProfile.findUnique({ where: { userId } }),
    prisma.plannedSession.findFirst({
      where: {
        week: { plan: { userId, status: 'ACTIVE' } },
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      select: { type: true },
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
    prisma.food.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, category: true,
        kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
        fiberPer100g: true, calciumMg: true, ironMg: true,
        potassiumMg: true, vitaminCMg: true, magnesiumMg: true,
        servingG: true, servingLabel: true,
      },
    }),
  ])

  const gymDayToday = gymToday?.template.days[0]
  const hasGymSessionToday = !!gymDayToday && !gymDayToday.isRestDay

  const todayDayType: DayType = todaySession
    ? getDayType(todaySession.type)
    : hasGymSessionToday
      ? 'hard'
      : 'easy'

  const DAY_TYPE_LABELS = {
    hard: { label: 'Día duro', emoji: '🔥', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    easy: { label: 'Día fácil', emoji: '✅', color: 'bg-green-100 text-green-700 border-green-200' },
    rest: { label: 'Descanso', emoji: '😴', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  }
  const badge = DAY_TYPE_LABELS[todayDayType]

  const hasMealPlan = !!mealPlan
  const hasFoodProfile = !!foodProfile

  // Targets del día según tipo (para pasar al FoodGuide)
  const todayKcal    = nutritionPlan
    ? (todayDayType === 'hard' ? nutritionPlan.targetKcalHard : todayDayType === 'rest' ? nutritionPlan.targetKcalRest : nutritionPlan.targetKcalEasy)
    : 0
  const todayCarbs   = nutritionPlan
    ? (todayDayType === 'hard' ? nutritionPlan.carbsHardG : nutritionPlan.carbsEasyG)
    : 0
  const todayProtein = nutritionPlan?.proteinG ?? 0
  const todayFat     = nutritionPlan?.fatG ?? 0

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

      {/* Contenido real — si hay meal plan completo */}
      {hasMealPlan && nutritionPlan && (
        <NutritionContent
          mealPlan={mealPlan.data as any}
          nutritionPlan={nutritionPlan}
          todayDayType={todayDayType}
        />
      )}

      {/* Macros rápidos — cuando hay nutritionPlan pero aún no meal plan */}
      {!hasMealPlan && nutritionPlan && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Tus macros de hoy</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Calorías', value: todayDayType === 'hard' ? nutritionPlan.targetKcalHard : todayDayType === 'rest' ? nutritionPlan.targetKcalRest : nutritionPlan.targetKcalEasy, unit: 'kcal', color: 'text-[#f97316]' },
                { label: 'Proteína', value: nutritionPlan.proteinG, unit: 'g', color: 'text-blue-600' },
                { label: 'Carbohidratos', value: todayDayType === 'hard' ? nutritionPlan.carbsHardG : nutritionPlan.carbsEasyG, unit: 'g', color: 'text-yellow-600' },
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
            <FoodSetupFlow hasFoodProfile={hasFoodProfile} />
          </div>
        </div>
      )}

      {/* Sin plan nutricional base */}
      {!hasMealPlan && !nutritionPlan && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
          Completa el onboarding para activar tu plan nutricional base.
        </div>
      )}

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
