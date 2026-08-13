// NUT-DASH-04 — Cards compactas de comidas planificadas para hoy
// Muestra las primeras 3 comidas del día (agrupadas por mealType) con alimentos y kcal
// Solo visible cuando hay PlannedMeals para hoy

import Link from 'next/link'
import LogTodayButton from './LogTodayButton'

type PlannedMeal = {
  id: string
  mealType: string
  grams: number
  food: { name: string; kcalPer100g: number }
}

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST:    'Desayuno',
  PRE_WORKOUT:  'Pre-entreno',
  LUNCH:        'Almuerzo',
  SNACK:        'Snack',
  DINNER:       'Cena',
  POST_WORKOUT: 'Post-entreno',
}

const MEAL_ORDER = ['BREAKFAST', 'PRE_WORKOUT', 'LUNCH', 'SNACK', 'DINNER', 'POST_WORKOUT']

export default function MealSummaryCards({ meals }: { meals: PlannedMeal[] }) {
  if (meals.length === 0) return null

  const byType: Record<string, PlannedMeal[]> = {}
  for (const m of meals) {
    if (!byType[m.mealType]) byType[m.mealType] = []
    byType[m.mealType].push(m)
  }

  const orderedTypes  = MEAL_ORDER.filter(t => byType[t])
  const visibleTypes  = orderedTypes.slice(0, 3)
  const totalComidas  = orderedTypes.length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Qué comer hoy</p>
        <div className="flex items-center gap-2">
          <LogTodayButton mealCount={meals.length} />
          <Link
            href="/nutrition/planner"
            className="text-xs font-semibold text-[#1e3a5f] hover:underline"
          >
            Ver plan ({totalComidas}) →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {visibleTypes.map((mealType) => {
          const items    = byType[mealType]!
          const totalKcal = Math.round(
            items.reduce((s, m) => s + (m.food.kcalPer100g * m.grams / 100), 0)
          )
          return (
            <div key={mealType} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                {MEAL_LABELS[mealType] ?? mealType}
              </p>
              <div className="space-y-0.5 mb-2">
                {items.map(item => (
                  <p key={item.id} className="text-xs text-gray-700 truncate">
                    {item.food.name}
                    <span className="text-gray-400 ml-1">{item.grams}g</span>
                  </p>
                ))}
              </div>
              <p className="text-xs font-bold text-orange-600">{totalKcal} kcal</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
