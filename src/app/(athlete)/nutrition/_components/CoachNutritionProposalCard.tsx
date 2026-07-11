'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  coachName: string | null
  message: string
  deltaKcal: number
  deltaProtein: number
  deltaCarbs: number
  deltaFat: number
}

function sign(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

export default function CoachNutritionProposalCard({
  id, coachName, message, deltaKcal, deltaProtein, deltaCarbs, deltaFat,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'ACCEPTED' | 'REJECTED' | null>(null)

  async function handle(action: 'ACCEPTED' | 'REJECTED') {
    setLoading(action)
    await fetch(`/api/athlete/nutrition/proposals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="bg-blue-50 border border-blue-300 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-lg">🏋️</span>
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Propuesta de tu coach{coachName ? ` (${coachName})` : ''}
          </p>
          <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {deltaKcal !== 0 && (
          <div className="bg-white rounded-xl p-3 border border-blue-200">
            <p className="text-blue-600 font-medium mb-0.5">Calorías</p>
            <p className="text-blue-800 font-bold text-base">{sign(deltaKcal)} kcal</p>
          </div>
        )}
        {deltaProtein !== 0 && (
          <div className="bg-white rounded-xl p-3 border border-blue-200">
            <p className="text-blue-600 font-medium mb-0.5">Proteína</p>
            <p className="text-blue-800 font-bold text-base">{sign(deltaProtein)}g</p>
          </div>
        )}
        {deltaCarbs !== 0 && (
          <div className="bg-white rounded-xl p-3 border border-blue-200">
            <p className="text-blue-600 font-medium mb-0.5">Carbohidratos</p>
            <p className="text-blue-800 font-bold text-base">{sign(deltaCarbs)}g</p>
          </div>
        )}
        {deltaFat !== 0 && (
          <div className="bg-white rounded-xl p-3 border border-blue-200">
            <p className="text-blue-600 font-medium mb-0.5">Grasas</p>
            <p className="text-blue-800 font-bold text-base">{sign(deltaFat)}g</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handle('ACCEPTED')}
          disabled={loading !== null}
          className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'ACCEPTED' ? 'Aceptando...' : 'Aceptar'}
        </button>
        <button
          onClick={() => handle('REJECTED')}
          disabled={loading !== null}
          className="flex-1 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'REJECTED' ? 'Rechazando...' : 'Rechazar'}
        </button>
      </div>
    </div>
  )
}
