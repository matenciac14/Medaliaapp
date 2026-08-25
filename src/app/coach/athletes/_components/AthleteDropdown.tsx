'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AthleteDropdownProps {
  athleteId: string
  status: 'ACTIVE' | 'PAUSED'
  isToggling: boolean
  onToggleStatus: () => void
}

const NAV_ITEMS = [
  { emoji: '\u{1F4AC}', label: 'Enviar mensaje', tab: 'mensajes' },
  { emoji: '\u{1F4CB}', label: 'Ver plan de entrenamiento', tab: 'plan' },
  { emoji: '\u{1F37D}\uFE0F', label: 'Ver nutrición', tab: 'nutricion' },
  { emoji: '\u{1F4CA}', label: 'Ver check-ins', tab: 'resumen' },
] as const

export default function AthleteDropdown({ athleteId, status, isToggling, onToggleStatus }: AthleteDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function navigate(tab: string) {
    setOpen(false)
    router.push(`/coach/athlete/${athleteId}?tab=${tab}`)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        aria-label="Acciones"
      >
        <span className="text-base leading-none">&#x22EF;</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1.5 z-50">
          {/* Navigation items */}
          {NAV_ITEMS.map((item) => (
            <button
              key={item.tab}
              onClick={() => navigate(item.tab)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-sm w-5 text-center shrink-0">{item.emoji}</span>
              {item.label}
            </button>
          ))}

          <div className="border-t border-gray-100 my-1" />

          {/* Config */}
          <button
            onClick={() => { setOpen(false); router.push(`/coach/athlete/${athleteId}/config`) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left"
          >
            <span className="text-sm w-5 text-center shrink-0">{'\u2699\uFE0F'}</span>
            Configurar features
          </button>

          {/* Cobros — disabled */}
          <button
            disabled
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-400 cursor-not-allowed text-left"
            title="Proximamente"
          >
            <span className="text-sm w-5 text-center shrink-0 opacity-60">{'\u{1F4B0}'}</span>
            <span className="opacity-60">Gestionar cobros (prox.)</span>
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Pausar / Reactivar */}
          <button
            onClick={() => { onToggleStatus(); setOpen(false) }}
            disabled={isToggling}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors text-left disabled:opacity-40 ${
              status === 'ACTIVE'
                ? 'text-red-600 hover:bg-red-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
          >
            <span className="text-sm w-5 text-center shrink-0">
              {status === 'ACTIVE' ? '\u23F8' : '\u25B6\uFE0F'}
            </span>
            {isToggling ? '...' : status === 'ACTIVE' ? 'Pausar atleta' : 'Reactivar atleta'}
          </button>
        </div>
      )}
    </div>
  )
}
