'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const FOOD_CATEGORIES = [
  {
    label: 'Proteínas',
    icon: '🥩',
    foods: [
      'Huevos', 'Pechuga de pollo', 'Muslo de pollo',
      'Carne de res (molida)', 'Chata / Punta de anca', 'Lomo de cerdo / Cañón',
      'Costillas de cerdo', 'Pierna de cerdo', 'Salmón', 'Tilapia',
      'Róbalo / Corvina', 'Atún en lata', 'Queso campesino',
    ],
  },
  {
    label: 'Carbohidratos',
    icon: '🍚',
    foods: [
      'Arroz blanco', 'Papa', 'Yuca', 'Plátano maduro', 'Plátano verde',
      'Pan blanco', 'Arepa', 'Avena', 'Frijoles', 'Lentejas',
    ],
  },
  {
    label: 'Grasas saludables',
    icon: '🥑',
    foods: ['Aguacate', 'Aceite de oliva', 'Crema de maní', 'Mantequilla', 'Almendras / Nueces'],
  },
  {
    label: 'Verduras y frutas',
    icon: '🥦',
    foods: [
      'Brócoli', 'Espárragos', 'Espinaca', 'Lechuga / Ensalada',
      'Tomate', 'Pepino', 'Zanahoria', 'Banano', 'Mango', 'Papaya', 'Fresas / Arándanos',
    ],
  },
]

const RESTRICTION_OPTIONS = [
  'Sin lácteos', 'Sin gluten', 'Sin cerdo', 'Sin mariscos',
  'Vegetariano', 'Sin huevo', 'Sin nueces',
]

type Step = 'foods' | 'prefs' | 'generating' | 'done'

interface Props {
  hasFoodProfile: boolean
}

export default function FoodSetupFlow({ hasFoodProfile }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(hasFoodProfile ? 'prefs' : 'foods')
  const [open, setOpen] = useState(false)

  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set())
  const [customFood, setCustomFood] = useState('')
  const [restrictions, setRestrictions] = useState<Set<string>>(new Set())
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [weighsFood, setWeighsFood] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function toggleFood(food: string) {
    setSelectedFoods(prev => {
      const next = new Set(prev)
      next.has(food) ? next.delete(food) : next.add(food)
      return next
    })
  }

  function addCustomFood() {
    const trimmed = customFood.trim()
    if (!trimmed) return
    setSelectedFoods(prev => new Set([...prev, trimmed]))
    setCustomFood('')
  }

  function toggleRestriction(r: string) {
    setRestrictions(prev => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })
  }

  async function handleGenerate() {
    setStep('generating')
    setError(null)
    try {
      const res = await fetch('/api/nutrition/generate-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableFoods: Array.from(selectedFoods),
          restrictions: Array.from(restrictions),
          mealsPerDay,
          weighsFood,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al generar el plan')
        setStep('prefs')
        return
      }
      setStep('done')
      setTimeout(() => {
        setOpen(false)
        router.refresh()
      }, 1500)
    } catch {
      setError('Error de conexión')
      setStep('prefs')
    }
  }

  if (!open) {
    return (
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a5298] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🍽️</span>
          <div>
            <h3 className="font-bold text-base">Configura tu plan de comidas</h3>
            <p className="text-white/70 text-xs mt-0.5">
              Dinos qué alimentos tienes y la AI arma tu menú semanal personalizado
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2.5 rounded-xl bg-white text-[#1e3a5f] text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          Configurar mi plan nutricional →
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {step === 'foods' ? 'Paso 1 de 2' : step === 'prefs' ? 'Paso 2 de 2' : ''}
            </p>
            <h2 className="text-base font-bold text-gray-900 mt-0.5">
              {step === 'foods' && '¿Qué alimentos tienes disponibles?'}
              {step === 'prefs' && 'Preferencias de alimentación'}
              {step === 'generating' && 'Generando tu plan...'}
              {step === 'done' && '¡Plan listo!'}
            </h2>
          </div>
          {(step === 'foods' || step === 'prefs') && (
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none p-1">
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* STEP 1: Selección de alimentos */}
          {step === 'foods' && (
            <div className="space-y-5">
              {FOOD_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {cat.icon} {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cat.foods.map(food => (
                      <button
                        key={food}
                        onClick={() => toggleFood(food)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selectedFoods.has(food)
                            ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]/40'
                        }`}
                      >
                        {food}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Alimento personalizado */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  + Agregar otro alimento
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customFood}
                    onChange={e => setCustomFood(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomFood()}
                    placeholder="ej. Chontaduro, Sardinas..."
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#1e3a5f]"
                  />
                  <button
                    onClick={addCustomFood}
                    className="px-4 py-2 rounded-xl bg-[#1e3a5f]/10 text-[#1e3a5f] text-sm font-medium hover:bg-[#1e3a5f]/20"
                  >
                    Agregar
                  </button>
                </div>
                {/* Alimentos custom seleccionados */}
                {Array.from(selectedFoods).filter(f => !FOOD_CATEGORIES.flatMap(c => c.foods).includes(f)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from(selectedFoods)
                      .filter(f => !FOOD_CATEGORIES.flatMap(c => c.foods).includes(f))
                      .map(f => (
                        <span key={f} className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#1e3a5f] text-white border border-[#1e3a5f]">
                          {f}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Preferencias */}
          {step === 'prefs' && (
            <div className="space-y-5">

              {/* Comidas por día */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  ¿Cuántas comidas al día?
                </p>
                <div className="flex gap-2">
                  {[3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setMealsPerDay(n)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                        mealsPerDay === n
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]/40'
                      }`}
                    >
                      {n} comidas
                    </button>
                  ))}
                </div>
              </div>

              {/* Pesa los alimentos */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  ¿Tienes báscula de cocina?
                </p>
                <div className="flex gap-2">
                  {[
                    { value: true, label: 'Sí, peso todo', desc: 'Gramos exactos' },
                    { value: false, label: 'No, a ojo', desc: 'Medidas caseras' },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setWeighsFood(opt.value)}
                      className={`flex-1 py-3 px-3 rounded-xl text-left text-sm border transition-colors ${
                        weighsFood === opt.value
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]/40'
                      }`}
                    >
                      <p className="font-semibold">{opt.label}</p>
                      <p className={`text-xs mt-0.5 ${weighsFood === opt.value ? 'text-white/70' : 'text-gray-400'}`}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Restricciones */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Restricciones alimentarias
                </p>
                <div className="flex flex-wrap gap-2">
                  {RESTRICTION_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => toggleRestriction(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        restrictions.has(r)
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Algo más que el coach deba saber (opcional)
                </p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ej. Solo puedo cocinar en microondas, prefiero no comer rojo en la noche..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
              )}
            </div>
          )}

          {/* Generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1e3a5f]/10 flex items-center justify-center">
                <span className="w-7 h-7 border-3 border-[#1e3a5f]/30 border-t-[#1e3a5f] rounded-full animate-spin block" style={{ borderWidth: 3 }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">Analizando tu perfil...</p>
                <p className="text-sm text-gray-500 mt-1">La AI está armando tu menú personalizado con tus alimentos</p>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
                ✅
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">¡Plan nutricional listo!</p>
                <p className="text-sm text-gray-500 mt-1">Cargando tu menú personalizado...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'foods' || step === 'prefs') && (
          <div className="px-5 py-4 border-t border-gray-100 bg-white">
            {step === 'foods' && (
              <button
                onClick={() => setStep('prefs')}
                disabled={selectedFoods.size < 2}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Continuar ({selectedFoods.size} alimentos) →
              </button>
            )}
            {step === 'prefs' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('foods')}
                  className="px-5 py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#1e3a5f' }}
                >
                  Generar mi plan nutricional
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
