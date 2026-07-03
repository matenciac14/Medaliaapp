'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type GoalOption = {
  value: string
  icon: string
  label: string
  subtext: string
  weeks: number
  hasDate: boolean
}

const GOALS: GoalOption[] = [
  { value: 'RACE_5K',            icon: '🏃', label: '5K',                     subtext: 'Carrera de 5 km — 8 semanas',         weeks: 8,  hasDate: true  },
  { value: 'RACE_10K',           icon: '🏃', label: '10K',                    subtext: 'Carrera de 10 km — 12 semanas',       weeks: 12, hasDate: true  },
  { value: 'STRENGTH_TRAINING',  icon: '🏋️', label: 'Ganar músculo',          subtext: 'Fuerza e hipertrofia — 16 semanas',  weeks: 16, hasDate: false },
  { value: 'BODY_RECOMPOSITION', icon: '💪', label: 'Recomposición corporal', subtext: 'Fuerza + composición — 16 semanas',  weeks: 16, hasDate: false },
  { value: 'GENERAL_FITNESS',    icon: '⚡', label: 'Fitness general',        subtext: 'Condición física base — 12 semanas', weeks: 12, hasDate: false },
]

const LOADING_STEPS = [
  'Analizando tu perfil...',
  'Calculando zonas de entrenamiento...',
  'Estructurando semanas y fases...',
  'Guardando tu plan...',
]

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function NewGoalClient({ defaultGoal }: { defaultGoal: string | null }) {
  const router = useRouter()
  const [selected, setSelected] = useState<GoalOption | null>(
    () => GOALS.find(g => g.value === defaultGoal) ?? null
  )
  const [raceDate, setRaceDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!selected) return
    setLoading(true)
    setError('')

    let step = 0
    const interval = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1)
      setLoadingStep(step)
    }, 1200)

    try {
      const res = await fetch('/api/plan/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalType: selected.value, raceDate: raceDate || undefined }),
      })
      const data = await res.json()
      clearInterval(interval)
      if (!res.ok) throw new Error(data.error ?? 'Error generando plan')
      router.push('/plan')
      router.refresh()
    } catch (err) {
      clearInterval(interval)
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-5xl animate-bounce">{selected?.icon}</div>
          <div>
            <p className="font-bold text-[#1e3a5f] text-lg mb-1">{selected?.label}</p>
            <p className="text-sm text-gray-500">{selected?.weeks} semanas de entrenamiento</p>
          </div>
          <div className="space-y-2">
            {LOADING_STEPS.map((s, i) => (
              <div key={i} className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all',
                i < loadingStep ? 'text-green-600' : i === loadingStep ? 'text-[#1e3a5f] font-medium bg-white shadow-sm' : 'text-gray-300'
              )}>
                <span className="text-base">{i < loadingStep ? '✓' : i === loadingStep ? '⏳' : '○'}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md space-y-6">

        <div>
          <Link href="/plan" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Volver
          </Link>
          <h1 className="text-2xl font-bold text-[#1e3a5f] mt-4">¿Cuál es tu próxima meta?</h1>
          <p className="text-sm text-gray-500 mt-1">Elige una y Medaliq arma tu plan periodizado.</p>
        </div>

        {defaultGoal && selected && (
          <p className="text-xs text-[#f97316] bg-orange-50 border border-orange-100 rounded-xl px-4 py-2">
            Pre-seleccionado según tu onboarding — puedes cambiar la meta.
          </p>
        )}

        <div className="space-y-2">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => { setSelected(g); setRaceDate('') }}
              className={cn(
                'w-full text-left px-5 py-4 rounded-2xl border-2 transition-all flex items-center gap-4',
                selected?.value === g.value
                  ? 'border-[#f97316] bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <span className="text-2xl">{g.icon}</span>
              <span className="flex flex-col">
                <span className={cn('font-semibold text-sm', selected?.value === g.value ? 'text-[#f97316]' : 'text-[#1e3a5f]')}>
                  {g.label}
                </span>
                <span className="text-xs text-gray-400">{g.subtext}</span>
              </span>
            </button>
          ))}
        </div>

        {selected?.hasDate && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del evento <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/40"
            />
            <p className="text-xs text-gray-400 mt-2">Si no tienes fecha fija, el plan igual se estructura a {selected.weeks} semanas desde hoy.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={!selected}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: selected ? '#f97316' : '#9ca3af' }}
        >
          {selected ? `Generar plan — ${selected.label} →` : 'Elige una meta primero'}
        </button>

      </div>
    </div>
  )
}
