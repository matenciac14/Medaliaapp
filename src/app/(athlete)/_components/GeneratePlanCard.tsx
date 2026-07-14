'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Props = {
  firstName: string
  completedPlanName: string | null
  streakDays: number
  goalLabel: string  // e.g. "Fuerza", "5K", "Recomposición"
}

export default function GeneratePlanCard({ firstName, completedPlanName, streakDays, goalLabel }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/plan/generate', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Error generando el plan.')
        return
      }
      router.push('/plan')
      router.refresh()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="text-center py-4">
        {completedPlanName ? (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-4">
              <span className="text-base">🏆</span>
              <span className="text-sm font-semibold text-green-800">Completaste: {completedPlanName}</span>
            </div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">¿Listo para el siguiente ciclo?</h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              Genera tu nuevo plan de {goalLabel} y sigue progresando.
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">
              Tu plan te espera, {firstName}
            </h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              Basado en tu perfil te generamos un plan de {goalLabel} estructurado semana a semana.
            </p>
          </>
        )}

        {streakDays >= 2 && (
          <div className="flex items-center justify-center mt-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-600">
              🔥 {streakDays} días seguidos
            </span>
          </div>
        )}
      </div>

      {/* CTA principal */}
      <div className="bg-[#1e3a5f] rounded-2xl p-6 text-white text-center">
        <p className="text-sm text-blue-200 mb-1 font-medium">Plan estructurado · {goalLabel}</p>
        <p className="text-base font-bold mb-4">Semanas planificadas · progresión automática</p>

        {error && (
          <p className="text-red-300 text-sm mb-3">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-[#ea580c] text-white rounded-xl py-3.5 font-bold text-base
            hover:bg-[#c2410c] active:bg-[#9a3412] transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Generando tu plan...' : 'Generar mi plan →'}
        </button>

        <p className="text-xs text-blue-300 mt-3">
          Puedes ajustarlo con un entrenador en cualquier momento
        </p>
      </div>

      {/* CTA secundario: registrar sesión o buscar coach */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/log" className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
          <p className="text-sm font-bold text-[#1e3a5f] mb-1">🏃 Registrar sesión</p>
          <p className="text-xs text-gray-500">Mientras tanto, lleva tu log</p>
        </Link>
        <Link href="/coaches" className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
          <p className="text-sm font-bold text-[#1e3a5f] mb-1">🎯 Ver entrenadores</p>
          <p className="text-xs text-gray-500">Plan 100% personalizado</p>
        </Link>
      </div>

    </div>
  )
}
