'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MUSCLE_GROUPS = [
  { value: 'QUADRICEPS', label: 'Cuádriceps' },
  { value: 'HAMSTRINGS', label: 'Isquiotibiales' },
  { value: 'GLUTES', label: 'Glúteos' },
  { value: 'CHEST', label: 'Pecho' },
  { value: 'BACK', label: 'Espalda' },
  { value: 'SHOULDERS', label: 'Hombros' },
  { value: 'BICEPS', label: 'Bíceps' },
  { value: 'TRICEPS', label: 'Tríceps' },
  { value: 'ABS', label: 'Abdomen' },
  { value: 'CALVES', label: 'Gemelos' },
  { value: 'FULL_BODY', label: 'Cuerpo completo' },
]

const EQUIPMENT_OPTIONS = [
  { value: 'BARBELL', label: 'Barra' },
  { value: 'DUMBBELL', label: 'Mancuerna' },
  { value: 'MACHINE', label: 'Máquina' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'SMITH', label: 'Smith' },
  { value: 'BODYWEIGHT', label: 'Peso corporal' },
  { value: 'KETTLEBELL', label: 'Kettlebell' },
  { value: 'BAND', label: 'Banda elástica' },
  { value: 'OTHER', label: 'Otro' },
]

const CATEGORY_OPTIONS = [
  { value: 'COMPOUND', label: 'Compuesto' },
  { value: 'ISOLATION', label: 'Aislamiento' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'FUNCTIONAL', label: 'Funcional' },
  { value: 'STRETCH', label: 'Estiramiento' },
]

export default function ExerciseForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [equipment, setEquipment] = useState('BARBELL')
  const [category, setCategory] = useState('COMPOUND')
  const [description, setDescription] = useState('')
  const [tips, setTips] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleMuscle(value: string) {
    setMuscleGroups((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (muscleGroups.length === 0) {
      setError('Selecciona al menos un grupo muscular')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/coach/gym/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, muscleGroups, equipment, category, description, tips }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al crear ejercicio')
      }

      router.push('/coach/gym/exercises')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-gray-900">Nuevo ejercicio</h2>
        <a
          href="/coach/gym/exercises"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancelar
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Sentadilla con barra"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300"
          />
        </div>

        {/* Muscle groups */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grupos musculares <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleMuscle(value)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  muscleGroups.includes(value)
                    ? 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipo</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800"
            >
              {EQUIPMENT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800"
            >
              {CATEGORY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
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

        {/* Tips */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tips de ejecución</label>
          <textarea
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            placeholder="Errores comunes a evitar, cues de activación..."
            rows={2}
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
