'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChefHat, Users, Flame, Pencil, Trash2 } from 'lucide-react'

type DayTotals = { kcal: number; proteinG: number; carbsG: number; fatG: number }
type Template = {
  id: string
  name: string
  description: string | null
  goal: string | null
  createdAt: Date
  dayTotals: Record<string, DayTotals>
  _count: { assignments: number }
}

const DAY_LABELS: Record<string, string> = { HARD: 'Día duro', EASY: 'Día fácil', REST: 'Descanso' }
const DAY_COLORS: Record<string, string> = {
  HARD: 'bg-red-50 border-red-200 text-red-700',
  EASY: 'bg-green-50 border-green-200 text-green-700',
  REST: 'bg-gray-50 border-gray-200 text-gray-600',
}

export default function NutritionTemplatesClient({ templates }: { templates: Template[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/coach/nutrition/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Error al crear template.')
        return
      }
      const { template } = await res.json()
      setCreating(false)
      setNewName('')
      router.push(`/coach/nutrition/templates/${template.id}/build`)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este plan nutricional? Esta acción no se puede deshacer.')) return
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/coach/nutrition/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Error al eliminar.')
        return
      }
      router.refresh()
    })
    setDeletingId(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat size={24} className="text-orange-600" />
            Planes Nutricionales
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea planes reutilizables y asígnalos a tus atletas
          </p>
        </div>
        <button
          onClick={() => { setCreating(true); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#ea580c' }}
        >
          <Plus size={16} />
          Nuevo plan
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Modal de creación */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nuevo plan nutricional</h2>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              placeholder="Nombre del plan (ej. Plan Running Competición)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setCreating(false); setNewName('') }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || !newName.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#ea580c' }}
              >
                {isPending ? 'Creando…' : 'Crear y abrir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista vacía */}
      {templates.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <ChefHat size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium mb-1">Sin planes nutricionales</p>
          <p className="text-sm text-gray-400 mb-6">
            Crea un plan reutilizable y asígnalo a tus atletas en segundos.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#ea580c' }}
          >
            Crear primer plan
          </button>
        </div>
      )}

      {/* Grid de templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Card header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                  {t.goal && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                      {t.goal}
                    </span>
                  )}
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/coach/nutrition/templates/${t.id}/build`)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={t._count.assignments > 0}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t._count.assignments > 0 ? 'Tiene atletas asignados' : 'Eliminar'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Totales por día */}
            <div className="px-5 pb-4 space-y-1.5">
              {(['HARD', 'EASY', 'REST'] as const).map((day) => {
                const totals = t.dayTotals[day]
                const hasData = totals && totals.kcal > 0
                return (
                  <div
                    key={day}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs ${DAY_COLORS[day]}`}
                  >
                    <span className="font-medium">{DAY_LABELS[day]}</span>
                    {hasData ? (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Flame size={11} />
                          {Math.round(totals.kcal)} kcal
                        </span>
                        <span>P {Math.round(totals.proteinG)}g</span>
                        <span>C {Math.round(totals.carbsG)}g</span>
                      </div>
                    ) : (
                      <span className="opacity-50">Sin alimentos</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users size={13} />
                <span>{t._count.assignments} atleta{t._count.assignments !== 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={() => router.push(`/coach/nutrition/templates/${t.id}/build`)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                Abrir constructor →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
