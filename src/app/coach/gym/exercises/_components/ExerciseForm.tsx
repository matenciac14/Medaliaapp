'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ExerciseForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [target, setTarget] = useState('')
  const [equipment, setEquipment] = useState('')
  const [mechanic, setMechanic] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !bodyPart.trim() || !target.trim() || !equipment.trim()) {
      setError('Nombre, parte del cuerpo, músculo objetivo y equipamiento son obligatorios')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/coach/gym/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bodyPart, target, equipment, mechanic: mechanic || null, description: description || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al crear ejercicio')
      }

      router.push('/coach/gym/exercises')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear ejercicio')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-gray-900">Nuevo ejercicio</h2>
        <a href="/coach/gym/exercises" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Cancelar
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Sentadilla con barra"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parte del cuerpo <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(ej. upper legs)</span>
            </label>
            <input
              type="text"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="upper legs"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Músculo objetivo <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(ej. quads)</span>
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="quads"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipamiento <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(ej. barbell)</span>
            </label>
            <input
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="barbell"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mecánica
              <span className="text-gray-400 font-normal ml-1">(ej. compound)</span>
            </label>
            <input
              type="text"
              value={mechanic}
              onChange={(e) => setMechanic(e.target.value)}
              placeholder="compound"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve del ejercicio y técnica..."
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
            style={{ backgroundColor: '#ea580c' }}
          >
            {loading ? 'Guardando...' : 'Guardar ejercicio'}
          </button>
          <a
            href="/coach/gym/exercises"
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  )
}
