'use client'

import { useState } from 'react'
import { Flame, Check, Moon, Activity } from 'lucide-react'
import { type DayType } from '@/lib/nutrition/day_type'

type MealFoodItem = {
  name: string
  g: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

type Meal = {
  time: string
  label: string
  foods: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  items?: MealFoodItem[]
}

type Supplement = {
  name: string
  dose: string
  when: string
  purpose: string
}

type DayMeals = {
  meals: Meal[]
  supplements: Supplement[]
  hydrationL: number
  rules: string[]
}

export type MealPlanData = {
  hard: DayMeals
  easy: DayMeals
  rest: DayMeals
}

// Coach constructor saves a different format (slots: breakfast/lunch/dinner/snacks).
// Normalize it to the canonical format before rendering.
type CoachMealEntry = { foodName: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }
type CoachDayMeals = { breakfast?: CoachMealEntry[]; lunch?: CoachMealEntry[]; dinner?: CoachMealEntry[]; snacks?: CoachMealEntry[] }

function normalizeDay(raw: unknown): DayMeals {
  if (!raw || typeof raw !== 'object') return { meals: [], supplements: [], hydrationL: 2, rules: [] }
  const r = raw as Record<string, unknown>

  // Already canonical format
  if (Array.isArray(r.meals)) return raw as DayMeals

  // Coach constructor format — convert slots to meals array
  const coachDay = r as CoachDayMeals
  const slotLabels: Record<string, string> = {
    breakfast: 'Desayuno',
    lunch: 'Almuerzo',
    dinner: 'Cena',
    snacks: 'Snack',
  }
  const meals: Meal[] = []
  for (const [slot, label] of Object.entries(slotLabels)) {
    const entries = (coachDay[slot as keyof CoachDayMeals] ?? []) as CoachMealEntry[]
    if (entries.length === 0) continue
    const totals = entries.reduce(
      (acc, e) => ({ kcal: acc.kcal + e.kcal, protein: acc.protein + e.protein, carbs: acc.carbs + e.carbs, fat: acc.fat + e.fat }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )
    meals.push({
      time: '',
      label,
      foods: entries.map((e) => `${e.foodName} ${e.grams}g`).join(', '),
      items: entries.map(e => ({ name: e.foodName, g: e.grams, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat })),
      ...totals,
    })
  }
  return { meals, supplements: [], hydrationL: 2, rules: [] }
}

function normalizeMealPlan(data: unknown): MealPlanData & { low: DayMeals } {
  if (!data || typeof data !== 'object') {
    const empty = { meals: [], supplements: [], hydrationL: 2, rules: [] }
    return { hard: empty, easy: empty, low: empty, rest: empty }
  }
  const d = data as Record<string, unknown>
  const easy = normalizeDay(d.easy)
  return {
    hard: normalizeDay(d.hard),
    easy,
    low: normalizeDay(d.low ?? d.easy), // no 'low' key in some plans — fall back to easy meals
    rest: normalizeDay(d.rest),
  }
}

const DAY_TABS: { key: DayType; label: string; Icon: React.ElementType; color: string }[] = [
  { key: 'hard', label: 'Día duro',   Icon: Flame,    color: '#ea580c' },
  { key: 'easy', label: 'Día fácil',  Icon: Check,    color: '#16a34a' },
  { key: 'low',  label: 'Día suave',  Icon: Activity, color: '#8b5cf6' },
  { key: 'rest', label: 'Descanso',   Icon: Moon,     color: '#6b7280' },
]

const MEAL_ICONS: Record<string, string> = {
  'Pre-entreno': '⚡',
  'Recuperación': '🔄',
  'Post-entreno': '🔄',
  'Desayuno': '🌅',
  'Almuerzo': '☀️',
  'Merienda': '🍎',
  'Snack': '🍎',
  'Cena': '🌙',
}

interface Props {
  mealPlan: MealPlanData | (MealPlanData & { low: DayMeals })
  todayDayType: DayType
}

export default function NutritionContent({ mealPlan, todayDayType }: Props) {
  const [activeTab, setActiveTab] = useState<DayType>(todayDayType)

  const normalizedPlan = normalizeMealPlan(mealPlan)
  const dayData = normalizedPlan[activeTab]

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {DAY_TABS.map(({ key, label, Icon, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${
              activeTab === key
                ? 'bg-[#1e3a5f] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={13} color={activeTab === key ? 'white' : color} strokeWidth={2.5} />
            {label}
            {key === todayDayType && activeTab !== key && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Menú del día */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Menu del dia · {dayData.meals.length} comidas
        </h2>
        <div className="space-y-3">
          {dayData.meals.map((meal, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/5 flex items-center justify-center text-xl shrink-0">
                  {MEAL_ICONS[meal.label] ?? '🍽️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{meal.label}</p>
                      <p className="text-xs text-gray-400">{meal.time}</p>
                    </div>
                    <span className="text-sm font-bold text-[#ea580c]">{meal.kcal} kcal</span>
                  </div>
                  {meal.items && meal.items.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {meal.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs gap-2">
                          <span className="text-gray-700 font-medium min-w-0 truncate">{item.name} <span className="text-gray-400 font-normal">· {item.g}g</span></span>
                          <span className="text-gray-500 shrink-0 whitespace-nowrap">{item.kcal} kcal · P{item.protein}g · C{item.carbs}g · G{item.fat}g</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">{meal.foods}</p>
                  )}
                  <div className="flex gap-3 mt-2.5 flex-wrap">
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">P {meal.protein}g</span>
                    <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded-full">C {meal.carbs}g</span>
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">G {meal.fat}g</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Suplementación */}
      {dayData.supplements.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Suplementacion</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 col-span-1">Suplemento</span>
              <span className="text-xs font-semibold text-gray-500">Dosis</span>
              <span className="text-xs font-semibold text-gray-500">Cuando</span>
              <span className="text-xs font-semibold text-gray-500">Para que</span>
            </div>
            {dayData.supplements.map((s, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-4 px-4 py-3 text-xs gap-1 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
              >
                <span className="font-medium text-gray-900 col-span-1 pr-2">{s.name}</span>
                <span className="text-gray-600">{s.dose}</span>
                <span className="text-gray-600">{s.when}</span>
                <span className="text-gray-500">{s.purpose}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
