/**
 * NUT-F-02 — Vista semanal de comidas planificadas.
 * Muestra los 7 días de la semana con su tipo de día (Duro/Fácil/Descanso)
 * derivado de la intensidad del plan, y las comidas planificadas de ese tipo.
 */
import type { MealPlanData } from './NutritionContent'

type WeekDay = {
  label: string        // "Lun", "Mar"...
  date: string         // "14 jul"
  dayType: 'hard' | 'easy' | 'rest' | null
  isToday: boolean
  hasSession: boolean
}

type Props = {
  days: WeekDay[]
  mealPlan: MealPlanData
}

const DAY_TYPE_CONFIG = {
  hard: { label: 'Duro',    emoji: '🔥', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  easy: { label: 'Fácil',   emoji: '✅', bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700'  },
  rest: { label: 'Descanso',emoji: '😴', bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700'   },
}

export default function WeeklyMenuStrip({ days, mealPlan }: Props) {
  const todayIdx = days.findIndex(d => d.isToday)
  const displayIdx = todayIdx >= 0 ? todayIdx : 0
  const today = days[displayIdx]
  const todayPlan = today?.dayType ? mealPlan[today.dayType] : null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          🗓️ Menú de esta semana
        </p>

        {/* Day strip */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {days.map((day, i) => {
            const cfg = day.dayType ? DAY_TYPE_CONFIG[day.dayType] : null
            return (
              <div
                key={i}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl min-w-[44px]
                  ${day.isToday
                    ? 'bg-[#1e3a5f] text-white'
                    : cfg
                      ? `${cfg.bg} border ${cfg.border}`
                      : 'bg-gray-50'
                  }`}
              >
                <p className={`text-[10px] font-semibold ${day.isToday ? 'text-blue-200' : 'text-gray-400'}`}>
                  {day.label}
                </p>
                <p className={`text-[11px] font-bold ${day.isToday ? 'text-white' : 'text-gray-700'}`}>
                  {day.date}
                </p>
                <p className="text-base leading-none mt-0.5">
                  {cfg ? cfg.emoji : '–'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Comidas del día actual */}
      {todayPlan && todayPlan.meals.length > 0 ? (
        <div className="px-4 pb-4">
          <div className={`mt-2 rounded-xl p-3 ${today.dayType ? DAY_TYPE_CONFIG[today.dayType].bg : 'bg-gray-50'}`}>
            <p className={`text-[11px] font-semibold mb-2 ${today.dayType ? DAY_TYPE_CONFIG[today.dayType].text : 'text-gray-500'}`}>
              Hoy — {today.dayType ? DAY_TYPE_CONFIG[today.dayType].label : ''}
            </p>
            <div className="space-y-2">
              {todayPlan.meals.map((meal, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{meal.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{meal.foods}</p>
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 shrink-0">{meal.kcal} kcal</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Total: {todayPlan.meals.reduce((s, m) => s + m.kcal, 0)} kcal
              · {todayPlan.meals.reduce((s, m) => s + m.protein, 0).toFixed(0)}g prot
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 mt-2">Sin plan de comidas — configura tu menú en el builder</p>
        </div>
      )}
    </div>
  )
}
