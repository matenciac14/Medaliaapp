'use client'

import { useState, useEffect } from 'react'
import { Flame, Check, Moon } from 'lucide-react'

type Meal = {
  time: string
  label: string
  foods: string
  kcal: number
  protein: number
  carbs: number
  fat: number
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

type MealPlanData = {
  hard: DayMeals
  easy: DayMeals
  rest: DayMeals
}

type NutritionPlanTargets = {
  tdee: number
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
}

type DayType = 'hard' | 'easy' | 'rest'

const DAY_TABS: { key: DayType; label: string; Icon: React.ElementType; color: string }[] = [
  { key: 'hard', label: 'Día duro',  Icon: Flame, color: '#f97316' },
  { key: 'easy', label: 'Día fácil', Icon: Check, color: '#16a34a' },
  { key: 'rest', label: 'Descanso',  Icon: Moon,  color: '#6b7280' },
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
  mealPlan: MealPlanData
  nutritionPlan: NutritionPlanTargets
  todayDayType: DayType
}

export default function NutritionContent({ mealPlan, nutritionPlan, todayDayType }: Props) {
  const [activeTab, setActiveTab] = useState<DayType>(todayDayType)
  const [barsReady, setBarsReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  const dayData = mealPlan[activeTab]
  const targets = {
    hard:  { kcal: nutritionPlan.targetKcalHard, protein: nutritionPlan.proteinG, carbs: nutritionPlan.carbsHardG, fat: nutritionPlan.fatG },
    easy:  { kcal: nutritionPlan.targetKcalEasy, protein: nutritionPlan.proteinG, carbs: nutritionPlan.carbsEasyG, fat: nutritionPlan.fatG },
    rest:  { kcal: nutritionPlan.targetKcalRest, protein: nutritionPlan.proteinG, carbs: Math.round(nutritionPlan.carbsEasyG * 0.7), fat: nutritionPlan.fatG },
  }
  const target = targets[activeTab]

  const totalKcal = dayData.meals.reduce((s, m) => s + m.kcal, 0)
  const totalProtein = dayData.meals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs = dayData.meals.reduce((s, m) => s + m.carbs, 0)
  const totalFat = dayData.meals.reduce((s, m) => s + m.fat, 0)

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

      {/* Macros objetivo */}
      <div className="bg-[#1e3a5f] rounded-2xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-4">Macros objetivo del día</p>
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-[#f97316]">{target.kcal.toLocaleString()}</p>
            <p className="text-xs text-white/60 mt-0.5">kcal</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{target.protein}g</p>
            <p className="text-xs text-white/60 mt-0.5">proteína</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{target.carbs}g</p>
            <p className="text-xs text-white/60 mt-0.5">carbos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">{target.fat}g</p>
            <p className="text-xs text-white/60 mt-0.5">grasas</p>
          </div>
        </div>

        {/* Barras vs menú */}
        <div className="space-y-3 bg-white/10 rounded-xl p-4">
          <p className="text-xs text-white/50 mb-1">Aporte del menú vs objetivo</p>
          {[
            { label: 'Calorías', value: totalKcal, max: target.kcal, unit: ' kcal' },
            { label: 'Proteína', value: totalProtein, max: target.protein, unit: 'g' },
            { label: 'Carbohidratos', value: totalCarbs, max: target.carbs, unit: 'g' },
            { label: 'Grasas', value: totalFat, max: target.fat, unit: 'g' },
          ].map(bar => (
            <div key={bar.label} className="space-y-1">
              <div className="flex justify-between text-xs text-white/70">
                <span>{bar.label}</span>
                <span>{bar.value}{bar.unit} / {bar.max}{bar.unit}</span>
              </div>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full transition-all duration-700 ease-out"
                  style={{ width: barsReady ? `${Math.min((bar.value / bar.max) * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menú del día */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Menú del día · {dayData.meals.length} comidas
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
                    <span className="text-sm font-bold text-[#f97316]">{meal.kcal} kcal</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">{meal.foods}</p>
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

      {/* Hidratación */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Hidratación 💧</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">💧</div>
            <div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{dayData.hydrationL} L</p>
              <p className="text-xs text-gray-500">Meta diaria</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              'Al despertar: 500 ml con una pizca de sal marina',
              'Durante el entreno: 150-200 ml cada 20 minutos',
              'Post-sesión inmediato: 500 ml para recuperación',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suplementación */}
      {dayData.supplements.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Suplementación</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 col-span-1">Suplemento</span>
              <span className="text-xs font-semibold text-gray-500">Dosis</span>
              <span className="text-xs font-semibold text-gray-500">Cuándo</span>
              <span className="text-xs font-semibold text-gray-500">Para qué</span>
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

      {/* Reglas */}
      {dayData.rules.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reglas no negociables</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {dayData.rules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-3 px-4 py-3.5">
                <span className="text-lg shrink-0">
                  {['🕔', '🌙', '🚫', '⚖️', '💊'][idx] ?? '📌'}
                </span>
                <p className="text-sm text-gray-700">{rule}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TDEE info */}
      <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-2xl p-4">
        <p className="text-xs text-gray-500 mb-1">Tu TDEE estimado</p>
        <p className="text-lg font-bold text-[#1e3a5f]">{nutritionPlan.tdee.toLocaleString()} kcal / día</p>
        {(() => {
          const diff = nutritionPlan.tdee - target.kcal
          if (diff > 150) {
            const weeklyKg = ((diff * 7) / 7700).toFixed(1)
            return (
              <p className="text-xs text-gray-500 mt-1">
                Déficit: {diff.toLocaleString()} kcal hoy · Pérdida proyectada ~{weeklyKg} kg/semana
              </p>
            )
          }
          if (diff < -150) {
            return (
              <p className="text-xs text-gray-500 mt-1">
                Superávit: {Math.abs(diff).toLocaleString()} kcal hoy · Objetivo: ganancia muscular
              </p>
            )
          }
          return (
            <p className="text-xs text-gray-500 mt-1">
              Mantenimiento calórico · Sin déficit ni superávit significativo
            </p>
          )
        })()}
      </div>
    </div>
  )
}
