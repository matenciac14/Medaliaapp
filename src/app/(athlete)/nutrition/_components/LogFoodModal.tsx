'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type FoodItem = {
  id: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  servingG: number
  servingLabel: string | null
  [key: string]: unknown
}

const MEAL_TYPES = [
  { key: 'BREAKFAST',    label: 'Desayuno'     },
  { key: 'LUNCH',        label: 'Almuerzo'     },
  { key: 'DINNER',       label: 'Cena'         },
  { key: 'SNACK',        label: 'Snack'        },
  { key: 'PRE_WORKOUT',  label: 'Pre-entreno'  },
  { key: 'POST_WORKOUT', label: 'Post-entreno' },
]

const CATEGORY_LABELS: Record<string, string> = {
  PROTEIN:   'Proteínas',
  CARB:      'Carbohidratos',
  FAT:       'Grasas',
  VEGETABLE: 'Verduras',
  FRUIT:     'Frutas',
  DAIRY:     'Lácteos',
  LEGUME:    'Legumbres',
}

type Step = 'search' | 'detail'

type Props = {
  foods: FoodItem[]
  date?: string
  onClose: () => void
}

export default function LogFoodModal({ foods, date, onClose }: Props) {
  const router = useRouter()

  const [step, setStep]               = useState<Step>('search')
  const [query, setQuery]             = useState('')
  const [selected, setSelected]       = useState<FoodItem | null>(null)
  const [grams, setGrams]             = useState('')
  const [mealType, setMealType]       = useState('BREAKFAST')
  const [submitting, setSubmitting]   = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return foods.slice(0, 30)
    const q = query.toLowerCase()
    return foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 40)
  }, [foods, query])

  function selectFood(food: FoodItem) {
    setSelected(food)
    setGrams(String(Math.round(food.servingG)))
    setStep('detail')
  }

  async function handleSubmit() {
    if (!selected || !grams) return
    const g = Number(grams)
    if (isNaN(g) || g <= 0) return
    setSubmitting(true)
    try {
      await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodId: selected.id, grams: g, mealType, date }),
      })
      router.refresh()
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setStep('search')
    setQuery('')
    setSelected(null)
    setGrams('')
    setMealType('BREAKFAST')
    onClose()
  }

  const preview = selected && grams
    ? (() => {
        const r = Number(grams) / 100
        return {
          kcal:     Math.round(selected.kcalPer100g    * r),
          proteinG: Math.round(selected.proteinPer100g * r * 10) / 10,
          carbsG:   Math.round(selected.carbsPer100g   * r * 10) / 10,
          fatG:     Math.round(selected.fatPer100g     * r * 10) / 10,
        }
      })()
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step === 'detail' && (
              <button onClick={() => setStep('search')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ←
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900">
              {step === 'search' ? 'Registrar comida' : selected?.name}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* STEP: search */}
        {step === 'search' && (
          <>
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                <span className="text-gray-400 text-sm">🔍</span>
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar alimento..."
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-gray-400 text-sm">✕</button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 mt-10">Sin resultados para "{query}"</p>
              ) : (
                filtered.map(food => {
                  const r = food.servingG / 100
                  const kcal = Math.round(food.kcalPer100g * r)
                  const prot = Math.round(food.proteinPer100g * r * 10) / 10
                  return (
                    <button
                      key={food.id}
                      onClick={() => selectFood(food)}
                      className="w-full flex items-center justify-between py-3.5 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{food.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {CATEGORY_LABELS[food.category] ?? food.category}
                          {food.servingLabel ? ` · ${food.servingLabel}` : ''}
                        </p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-sm font-bold text-orange-500">{kcal} kcal</p>
                        <p className="text-xs text-gray-400">P {prot}g · por porción</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* STEP: detail */}
        {step === 'detail' && selected && (
          <>
            <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 space-y-5">

              {/* Gramos */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cantidad (gramos)</p>
                <div className="flex gap-2 mb-3">
                  {[50, 100, 150, 200].map(g => (
                    <button
                      key={g}
                      onClick={() => setGrams(String(g))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                        grams === String(g)
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {g}g
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={grams}
                  onChange={e => setGrams(e.target.value)}
                  placeholder="Otro valor..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-semibold text-gray-900 outline-none focus:border-[#1e3a5f] transition-colors"
                />
                {selected.servingLabel && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Porción típica: {selected.servingLabel} ({Math.round(selected.servingG)}g)
                  </p>
                )}
              </div>

              {/* Preview macros */}
              {preview && (
                <div className="bg-[#1e3a5f] rounded-2xl p-4">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-3">Aporte de {grams}g</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Calorías', value: preview.kcal,     unit: 'kcal', color: 'text-orange-400' },
                      { label: 'Proteína', value: preview.proteinG, unit: 'g',    color: 'text-blue-300'   },
                      { label: 'Carbos',   value: preview.carbsG,   unit: 'g',    color: 'text-yellow-300' },
                      { label: 'Grasas',   value: preview.fatG,     unit: 'g',    color: 'text-green-300'  },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                        <p className="text-xs text-white/50">{m.unit}</p>
                        <p className="text-xs text-white/50">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Momento del día */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Momento del día</p>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map(mt => (
                    <button
                      key={mt.key}
                      onClick={() => setMealType(mt.key)}
                      className={`px-3.5 py-2 rounded-full border text-xs font-medium transition-colors ${
                        mealType === mt.key
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={handleSubmit}
                disabled={submitting || !grams || Number(grams) <= 0}
                className="w-full py-3.5 rounded-2xl text-sm font-bold transition-colors disabled:bg-gray-100 disabled:text-gray-400 bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
              >
                {submitting ? 'Registrando...' : 'Registrar comida'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
