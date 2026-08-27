// NUT-WATER-01 — Widget de hidratacion diaria (compacto)
// 1 fila: emoji + valor/barra | 3 botones (+250/+500/+1L)
// Fetcha GET /api/nutrition/water al montar y actualiza optimistamente en cada POST

'use client'

import { useState, useEffect } from 'react'

const BUTTONS = [
  { label: '+250', delta: 250 },
  { label: '+500', delta: 500 },
  { label: '+1L',  delta: 1000 },
]

export default function HydrationWidget() {
  const [mlLogged, setMlLogged]    = useState(0)
  const [waterMlTarget, setTarget] = useState(2000)
  const [loading, setLoading]      = useState(true)
  const [adding, setAdding]        = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/nutrition/water')
      .then(r => r.json())
      .then(d => {
        setMlLogged(d.mlLogged ?? 0)
        setTarget(d.waterMlTarget ?? 2000)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(delta: number) {
    setAdding(delta)
    const prev = mlLogged
    const optimistic = Math.max(0, mlLogged + delta)
    setMlLogged(optimistic)
    try {
      const res = await fetch('/api/nutrition/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      if (res.ok) {
        const data = await res.json()
        setMlLogged(data.mlLogged ?? optimistic)
      } else {
        setMlLogged(prev)
      }
    } catch {
      setMlLogged(prev)
    } finally {
      setAdding(null)
    }
  }

  const pct = waterMlTarget > 0 ? Math.min((mlLogged / waterMlTarget) * 100, 100) : 0
  const liters = (mlLogged / 1000).toFixed(1)
  const targetL = (waterMlTarget / 1000).toFixed(1)

  return (
    <div className="flex items-center gap-2.5 bg-white rounded-2xl border border-gray-200 px-3.5 py-2.5">
      {/* Left: emoji + value + bar */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-base leading-none shrink-0">💧</span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            {loading ? (
              <span className="text-[10px] text-gray-400">...</span>
            ) : (
              <>
                <span className="text-base font-bold text-blue-500 leading-none">{liters}</span>
                <span className="text-[10px] text-gray-400">/ {targetL} L</span>
              </>
            )}
          </div>
          <div className="h-1 w-20 bg-blue-100 rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-300 bg-blue-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: 3 buttons */}
      <div className="flex gap-1 shrink-0">
        {BUTTONS.map(({ label, delta }) => (
          <button
            key={delta}
            onClick={() => handleAdd(delta)}
            disabled={adding !== null}
            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-blue-700 bg-[#edf2ff] hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {adding === delta ? '...' : label}
          </button>
        ))}
      </div>
    </div>
  )
}
