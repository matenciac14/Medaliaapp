'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AthleteOption {
  id: string
  name: string
  email: string
  alreadyAssigned: boolean
}

interface Props {
  templateId: string
  athletes: AthleteOption[]
}

export default function AssignForm({ templateId, athletes }: Props) {
  const router = useRouter()
  const [athleteId, setAthleteId] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [weeksDuration, setWeeksDuration] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!athleteId) {
      setError('Selecciona un atleta')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/coach/gym/routines/${templateId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          startDate,
          weeksDuration: weeksDuration !== '' ? Number(weeksDuration) : null,
          notes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al asignar la rutina')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/coach/gym')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-green-700 font-semibold">Rutina asignada exitosamente</p>
        <p className="text-green-600 text-sm mt-1">Redirigiendo...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      {/* Athlete select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Atleta <span className="text-red-500">*</span>
        </label>
        <select
          value={athleteId}
          onChange={(e) => setAthleteId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800"
        >
          <option value="">Seleccionar atleta...</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id} disabled={a.alreadyAssigned}>
              {a.name} ({a.email}){a.alreadyAssigned ? ' — ya asignado' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Start date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de inicio <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800"
        />
      </div>

      {/* Weeks duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duración en semanas{' '}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="number"
          min={1}
          max={52}
          value={weeksDuration}
          onChange={(e) => setWeeksDuration(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Sin límite"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas para este atleta{' '}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Indicaciones específicas, restricciones, ajustes de carga..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#f97316' }}
        >
          {loading ? 'Asignando...' : 'Asignar rutina'}
        </button>
        <a
          href="/coach/gym"
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  )
}
