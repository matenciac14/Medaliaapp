'use client'

import { useState, useMemo } from 'react'

type FoodItem = {
  id: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  servingG: number
  servingLabel?: string | null
}

type MealEntry = {
  foodId: string
  foodName: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

type DayMeals = {
  breakfast: MealEntry[]
  lunch: MealEntry[]
  dinner: MealEntry[]
  snacks: MealEntry[]
}

type MealPlanData = {
  hard: DayMeals
  easy: DayMeals
  rest: DayMeals
}

type DayType = 'hard' | 'easy' | 'rest'
type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snacks: 'Snacks',
}

const DAY_LABELS: Record<DayType, string> = {
  hard: 'Día duro',
  easy: 'Día fácil',
  rest: 'Día descanso',
}

const EMPTY_DAY: DayMeals = { breakfast: [], lunch: [], dinner: [], snacks: [] }

function calcMacros(grams: number, food: FoodItem): Omit<MealEntry, 'foodId' | 'foodName' | 'grams'> {
  const ratio = grams / 100
  return {
    kcal: Math.round(food.kcalPer100g * ratio),
    protein: Math.round(food.proteinPer100g * ratio * 10) / 10,
    carbs: Math.round(food.carbsPer100g * ratio * 10) / 10,
    fat: Math.round(food.fatPer100g * ratio * 10) / 10,
  }
}

function dayTotals(day: DayMeals) {
  const all = [...day.breakfast, ...day.lunch, ...day.dinner, ...day.snacks]
  return all.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

type NutritionPlanData = {
  tdee: number
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
}

type Props = {
  athleteId: string
  nutritionPlan: NutritionPlanData
  athleteFoods: FoodItem[]
  initialMealPlan: MealPlanData | null
}

export default function NutritionConstructor({ athleteId, nutritionPlan, athleteFoods, initialMealPlan }: Props) {
  const [activeDay, setActiveDay] = useState<DayType>('hard')
  const [plan, setPlan] = useState<MealPlanData>(
    initialMealPlan ?? { hard: EMPTY_DAY, easy: EMPTY_DAY, rest: EMPTY_DAY }
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Add food state
  const [addingTo, setAddingTo] = useState<{ slot: MealSlot } | null>(null)
  const [selectedFoodId, setSelectedFoodId] = useState('')
  const [grams, setGrams] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const targets = {
    hard: { kcal: nutritionPlan.targetKcalHard, protein: nutritionPlan.proteinG, carbs: nutritionPlan.carbsHardG, fat: nutritionPlan.fatG },
    easy: { kcal: nutritionPlan.targetKcalEasy, protein: nutritionPlan.proteinG, carbs: nutritionPlan.carbsEasyG, fat: nutritionPlan.fatG },
    rest: { kcal: nutritionPlan.targetKcalRest, protein: nutritionPlan.proteinG, carbs: nutritionPlan.carbsEasyG, fat: nutritionPlan.fatG },
  }

  const currentDay = plan[activeDay]
  const totals = useMemo(() => dayTotals(currentDay), [currentDay])
  const target = targets[activeDay]

  const filteredFoods = useMemo(
    () => athleteFoods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [athleteFoods, searchQuery]
  )

  function addEntry(slot: MealSlot) {
    const food = athleteFoods.find(f => f.id === selectedFoodId)
    if (!food) return
    const gramsNum = parseFloat(grams)
    if (isNaN(gramsNum) || gramsNum <= 0) return

    const entry: MealEntry = { foodId: food.id, foodName: food.name, grams: gramsNum, ...calcMacros(gramsNum, food) }

    setPlan(prev => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [slot]: [...prev[activeDay][slot], entry],
      },
    }))
    setSelectedFoodId('')
    setGrams('')
    setSearchQuery('')
    setAddingTo(null)
  }

  function removeEntry(slot: MealSlot, index: number) {
    setPlan(prev => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [slot]: prev[activeDay][slot].filter((_, i) => i !== index),
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/coach/athlete/${athleteId}/nutrition/meals`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const pct = (val: number, tgt: number) => Math.min(100, Math.round((val / (tgt || 1)) * 100))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Constructor de plan de comidas</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60 transition-opacity"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar plan'}
        </button>
      </div>

      {/* Sin alimentos en catálogo */}
      {athleteFoods.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          El atleta aún no ha seleccionado sus alimentos del catálogo. Debe actualizar su perfil alimenticio primero.
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(['hard', 'easy', 'rest'] as DayType[]).map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeDay === day ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {DAY_LABELS[day]}
          </button>
        ))}
      </div>

      {/* Target summary */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          { label: 'Kcal', val: totals.kcal, tgt: target.kcal, unit: '' },
          { label: 'Proteína', val: totals.protein, tgt: target.protein, unit: 'g' },
          { label: 'Carbs', val: totals.carbs, tgt: target.carbs, unit: 'g' },
          { label: 'Grasa', val: totals.fat, tgt: target.fat, unit: 'g' },
        ].map(({ label, val, tgt, unit }) => (
          <div key={label} className="text-center">
            <p className="text-gray-500 mb-1">{label}</p>
            <p className="font-semibold text-gray-900">{val}{unit} <span className="text-gray-400 font-normal">/ {tgt}{unit}</span></p>
            <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct(val, tgt)}%`, backgroundColor: pct(val, tgt) > 105 ? '#ef4444' : '#1e3a5f' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Meal slots */}
      {(Object.keys(MEAL_LABELS) as MealSlot[]).map(slot => (
        <div key={slot} className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Slot header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
            <span className="text-sm font-medium text-gray-700">{MEAL_LABELS[slot]}</span>
            <button
              onClick={() => { setAddingTo({ slot }); setSelectedFoodId(''); setGrams(''); setSearchQuery('') }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              + Agregar
            </button>
          </div>

          {/* Entries */}
          {currentDay[slot].length > 0 ? (
            <div className="divide-y divide-gray-50">
              {currentDay[slot].map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div>
                    <span className="text-gray-800 font-medium">{entry.foodName}</span>
                    <span className="text-gray-400 ml-1">({entry.grams}g)</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500">
                    <span>{entry.kcal} kcal</span>
                    <span className="hidden sm:inline">P:{entry.protein}g C:{entry.carbs}g G:{entry.fat}g</span>
                    <button onClick={() => removeEntry(slot, i)} className="text-gray-300 hover:text-red-400 ml-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-3 py-2 text-xs text-gray-400">Sin alimentos</p>
          )}

          {/* Add food inline */}
          {addingTo?.slot === slot && (
            <div className="px-3 py-3 bg-blue-50 border-t border-blue-100 space-y-2">
              <input
                type="text"
                placeholder="Buscar alimento..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedFoodId('') }}
                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              {searchQuery && (
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-50">
                  {filteredFoods.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                  ) : (
                    filteredFoods.slice(0, 8).map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFoodId(f.id); setSearchQuery(f.name); setGrams(String(f.servingG ?? 100)) }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors ${selectedFoodId === f.id ? 'bg-blue-50 font-medium' : ''}`}
                      >
                        {f.name}
                        <span className="text-gray-400 ml-1">({f.kcalPer100g} kcal/100g)</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Gramos"
                  value={grams}
                  onChange={e => setGrams(e.target.value)}
                  className="w-24 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  min={1}
                />
                {selectedFoodId && grams && (
                  <span className="text-xs text-gray-500 self-center">
                    = {Math.round((athleteFoods.find(f => f.id === selectedFoodId)?.kcalPer100g ?? 0) * parseFloat(grams || '0') / 100)} kcal
                  </span>
                )}
                <div className="flex gap-1 ml-auto">
                  <button onClick={() => setAddingTo(null)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    onClick={() => addEntry(slot)}
                    disabled={!selectedFoodId || !grams}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-40"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
