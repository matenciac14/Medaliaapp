'use client'

type MealItem = {
  mealType: string
  label: string
  foods: string
  kcal: number
  isLogged: boolean
}

type Props = {
  meals: MealItem[]
  totalLogged: number
  totalPlanned: number
  onRegister?: (mealType: string) => void
}

const MEAL_ORDER = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'PRE_WORKOUT', 'POST_WORKOUT']

export default function MealListInline({ meals, totalLogged, totalPlanned, onRegister }: Props) {
  const sorted = [...meals].sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Comidas de hoy</p>
        <p className="text-xs font-semibold text-gray-500">{totalLogged}/{totalPlanned}</p>
      </div>

      {sorted.map((meal) => (
        <div
          key={meal.mealType}
          className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
        >
          {/* Check circle */}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            meal.isLogged
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300'
          }`}>
            {meal.isLogged && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1e3a5f]">{meal.label}</p>
            <p className="text-xs text-gray-400 truncate">{meal.foods}</p>
          </div>

          {/* Kcal or register */}
          {meal.isLogged ? (
            <span className="text-sm font-bold text-green-600">{meal.kcal} kcal</span>
          ) : (
            <button
              onClick={() => onRegister?.(meal.mealType)}
              className="text-xs font-semibold text-[#ea580c] whitespace-nowrap"
            >
              + Registrar
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
