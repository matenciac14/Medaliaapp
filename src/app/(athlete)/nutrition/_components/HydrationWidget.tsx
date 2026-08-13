// NUT-WATER-01 — Widget de hidratación diaria
// Muestra ml registrados vs objetivo + 3 botones (+250ml / +500ml / +1L)
// Fetcha GET /api/nutrition/water al montar y actualiza optimistamente en cada POST

'use client'

import { useState, useEffect } from 'react'
import { Droplets } from 'lucide-react'

const BUTTONS = [
  { label: '+250 ml', delta: 250 },
  { label: '+500 ml', delta: 500 },
  { label: '+1 L',   delta: 1000 },
]

export default function HydrationWidget() {
  const [mlLogged, setMlLogged]         = useState(0)
  const [waterMlTarget, setTarget]      = useState(2000)
  const [loading, setLoading]           = useState(true)
  const [adding, setAdding]             = useState<number | null>(null)

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
        setMlLogged(mlLogged) // revert on error
      }
    } catch {
      setMlLogged(mlLogged)
    } finally {
      setAdding(null)
    }
  }

  const pct = waterMlTarget > 0 ? Math.min((mlLogged / waterMlTarget) * 100, 100) : 0
  const liters = (mlLogged / 1000).toFixed(1)
  const targetL = (waterMlTarget / 1000).toFixed(1)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Droplets size={16} className="text-blue-500 shrink-0" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Hidratación</p>
      </div>

      <div className="flex items-end justify-between mb-2">
        {loading ? (
          <span className="text-sm text-gray-400">Cargando…</span>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-600 leading-none">{liters}</span>
            <span className="text-sm text-gray-400">/ {targetL} L</span>
          </div>
        )}
        {!loading && pct >= 100 && (
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">¡Meta lograda!</span>
        )}
      </div>

      <div className="h-2 bg-blue-50 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: '#3b82f6' }}
        />
      </div>

      <div className="flex gap-2">
        {BUTTONS.map(({ label, delta }) => (
          <button
            key={delta}
            onClick={() => handleAdd(delta)}
            disabled={adding !== null}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors border border-blue-100"
          >
            {adding === delta ? '…' : label}
          </button>
        ))}
      </div>
    </div>
  )
}
