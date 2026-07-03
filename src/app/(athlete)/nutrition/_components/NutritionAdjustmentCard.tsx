'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  deltaKcal: number
  deltaCarbsG: number
  plannedKcal: number
  adjustedKcal: number
  plannedCarbsG: number
  adjustedCarbsG: number
  plannedIntensity: string
  actualIntensity: string
}

export default function NutritionAdjustmentCard({
  id,
  deltaKcal,
  deltaCarbsG,
  plannedKcal,
  adjustedKcal,
  plannedCarbsG,
  adjustedCarbsG,
  plannedIntensity,
  actualIntensity,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)

  async function handle(action: 'accept' | 'reject') {
    setLoading(action)
    await fetch(`/api/nutrition/adjustment/${id}/${action}`, { method: 'POST' })
    setLoading(null)
    router.refresh()
  }

  const kcalSign = deltaKcal >= 0 ? '+' : ''
  const carbsSign = deltaCarbsG >= 0 ? '+' : ''

  const intensityLabel: Record<string, string> = {
    HIGH: 'Alta', MODERATE: 'Moderada', LOW: 'Baja', REST: 'Descanso',
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-lg">⚡</span>
        <div>
          <p className="text-sm font-semibold text-amber-900">Ajuste nutricional pendiente</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Tu sesión fue de intensidad{' '}
            <span className="font-medium">{intensityLabel[actualIntensity] ?? actualIntensity}</span>
            {' '}(planeada: {intensityLabel[plannedIntensity] ?? plannedIntensity}).
            El sistema sugiere ajustar tus macros de hoy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white rounded-xl p-3 border border-amber-200">
          <p className="text-amber-600 font-medium mb-1">Calorías</p>
          <p className="text-gray-500 line-through">{plannedKcal} kcal</p>
          <p className="text-amber-800 font-bold text-base">{adjustedKcal} kcal</p>
          <p className="text-amber-600 font-medium">{kcalSign}{deltaKcal} kcal</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-amber-200">
          <p className="text-amber-600 font-medium mb-1">Carbohidratos</p>
          <p className="text-gray-500 line-through">{plannedCarbsG}g</p>
          <p className="text-amber-800 font-bold text-base">{adjustedCarbsG}g</p>
          <p className="text-amber-600 font-medium">{carbsSign}{deltaCarbsG}g</p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handle('accept')}
          disabled={loading !== null}
          className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'accept' ? 'Aceptando...' : 'Aceptar ajuste'}
        </button>
        <button
          onClick={() => handle('reject')}
          disabled={loading !== null}
          className="flex-1 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'reject' ? 'Rechazando...' : 'Mantener plan'}
        </button>
      </div>
    </div>
  )
}
