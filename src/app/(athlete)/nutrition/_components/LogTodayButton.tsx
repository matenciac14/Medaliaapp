// NUT-PLANNED-01 — Botón "Registrar todo lo planeado" (client component)
// Llama a POST /api/athlete/nutrition/planned-meals/log-today y recarga la página

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function LogTodayButton({ mealCount }: { mealCount: number }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleLog() {
    setState('loading')
    try {
      const res = await fetch('/api/athlete/nutrition/planned-meals/log-today', { method: 'POST' })
      if (res.ok) {
        setState('done')
        setTimeout(() => router.refresh(), 600)
      } else {
        setState('idle')
      }
    } catch {
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold">
        <CheckCircle size={14} />
        ¡Registrado!
      </div>
    )
  }

  return (
    <button
      onClick={handleLog}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
    >
      {state === 'loading' ? '…' : `Registrar todo (${mealCount})`}
    </button>
  )
}
