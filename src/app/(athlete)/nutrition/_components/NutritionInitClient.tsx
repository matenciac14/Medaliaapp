'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Dispara POST /api/nutrition/init en el cliente y refresca la página cuando termina.
// Renderizado solo cuando el Server Component detecta que falta el NutritionPlan base.
export default function NutritionInitClient() {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState(false)

  function runInit() {
    setError(false)
    setRetrying(true)
    fetch('/api/nutrition/init', { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error('init failed')
        router.refresh()
      })
      .catch(() => setError(true))
      .finally(() => setRetrying(false))
  }

  useEffect(() => { runInit() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        <span>⚠️</span>
        <span className="flex-1">No pudimos inicializar tu plan nutricional.</span>
        <button
          onClick={runInit}
          className="text-xs font-semibold underline hover:no-underline"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (retrying) {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
        <span className="animate-spin">⟳</span>
        <span>Generando tu plan nutricional...</span>
      </div>
    )
  }

  return null
}
