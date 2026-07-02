'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  logId: string
  initDurationMin: number | null
  initDistanceKm: number | null
  initRpe: number | null
  initNotes: string | null
}

export function EditRunButton({ logId, initDurationMin, initDistanceKm, initRpe, initNotes }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [durationMin, setDurationMin] = useState(initDurationMin ?? 30)
  const [distanceKm, setDistanceKm] = useState(
    initDistanceKm != null ? String(Number(initDistanceKm).toFixed(1)) : ''
  )
  const [rpe, setRpe] = useState<number | null>(initRpe)
  const [notes, setNotes] = useState(initNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isEditing) {
    return (
      <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-gray-400 hover:text-[#1e3a5f] transition-colors"
        >
          ✏️ Editar
        </button>
      </div>
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/log/session/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMin,
          distanceKm: distanceKm ? parseFloat(distanceKm) : null,
          rpe,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }
      setIsEditing(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3 bg-gray-50/50">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Duración (min)</label>
          <input
            type="number"
            min={1}
            max={600}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e3a5f] bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Distancia (km)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            placeholder="—"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e3a5f] bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">RPE</label>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRpe(rpe === n ? null : n)}
              className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                rpe === n
                  ? n <= 4
                    ? 'border-green-500 bg-green-500 text-white'
                    : n <= 6
                    ? 'border-yellow-500 bg-yellow-500 text-white'
                    : n <= 8
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-red-500 bg-red-500 text-white'
                  : 'border-gray-200 text-gray-400 bg-white hover:border-gray-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Notas</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcional"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e3a5f] bg-white"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => { setIsEditing(false); setError(null) }}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 text-sm font-semibold rounded-lg px-3 py-2 text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
