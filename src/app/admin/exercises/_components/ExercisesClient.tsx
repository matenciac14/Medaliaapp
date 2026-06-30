'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  EQUIPMENT_TYPES, EXERCISE_CATEGORIES,
  EQUIPMENT_LABEL, CATEGORY_LABEL,
  validateExercise,
} from '@/domain/admin/exercise'

type Exercise = {
  id: string
  name: string
  category: string
  equipment: string
  muscleGroups: string[]
  description: string | null
  tips: string | null
}

type FormState = {
  name: string
  category: string
  equipment: string
  muscleGroups: string
  description: string
  tips: string
}

const EMPTY_FORM: FormState = {
  name: '', category: 'COMPOUND', equipment: 'BARBELL',
  muscleGroups: '', description: '', tips: '',
}

export function ExercisesClient({ exercises: initial }: { exercises: Exercise[] }) {
  const [exercises, setExercises] = useState(initial)
  const [editing, setEditing]     = useState<Exercise | null>(null)
  const [creating, setCreating]   = useState(false)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors]       = useState<string[]>([])
  const [filter, setFilter]       = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function openCreate() { setForm(EMPTY_FORM); setErrors([]); setCreating(true); setEditing(null) }
  function openEdit(ex: Exercise) {
    setForm({ name: ex.name, category: ex.category, equipment: ex.equipment,
              muscleGroups: ex.muscleGroups.join(', '), description: ex.description ?? '', tips: ex.tips ?? '' })
    setErrors([])
    setEditing(ex)
    setCreating(false)
  }
  function closeForm() { setCreating(false); setEditing(null); setErrors([]) }

  function parsedForm() {
    return {
      name: form.name,
      category: form.category,
      equipment: form.equipment,
      muscleGroups: form.muscleGroups.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
      description: form.description || null,
      tips: form.tips || null,
    }
  }

  async function handleSave() {
    const data = parsedForm()
    const errs = validateExercise(data)
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])

    const url    = editing ? `/api/admin/exercises/${editing.id}` : '/api/admin/exercises'
    const method = editing ? 'PATCH' : 'POST'

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) { setErrors(json.errors ?? [json.error ?? 'Error al guardar.']); return }

    startTransition(() => { router.refresh() })
    closeForm()

    if (editing) {
      setExercises((prev) => prev.map((e) => e.id === editing.id ? { ...e, ...data, id: e.id } : e))
    } else {
      setExercises((prev) => [...prev, { ...data, id: json.exercise.id, description: data.description, tips: data.tips }])
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Esto puede afectar rutinas existentes que lo usen.`)) return
    const res = await fetch(`/api/admin/exercises/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setExercises((prev) => prev.filter((e) => e.id !== id))
    } else {
      alert('Error al eliminar el ejercicio.')
    }
  }

  const filtered = filter
    ? exercises.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()) || e.category.includes(filter.toUpperCase()))
    : exercises

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre o categoría…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          + Nuevo ejercicio
        </button>
      </div>

      {/* Formulario crear / editar */}
      {(creating || editing) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">
            {editing ? `Editar: ${editing.name}` : 'Nuevo ejercicio global'}
          </h2>

          {errors.length > 0 && (
            <ul className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 space-y-1">
              {errors.map((e) => <li key={e} className="text-xs text-red-700">• {e}</li>)}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Categoría *</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
                {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Equipamiento *</label>
              <select value={form.equipment} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
                {EQUIPMENT_TYPES.map((eq) => <option key={eq} value={eq}>{EQUIPMENT_LABEL[eq]}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Grupos musculares * <span className="text-gray-400 font-normal">(separados por coma: QUADRICEPS, GLUTES)</span>
              </label>
              <input value={form.muscleGroups} onChange={(e) => setForm((f) => ({ ...f, muscleGroups: e.target.value }))}
                placeholder="QUADRICEPS, GLUTES, HAMSTRINGS"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tips de ejecución</label>
              <textarea value={form.tips} onChange={(e) => setForm((f) => ({ ...f, tips: e.target.value }))}
                rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none" />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={closeForm} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={isPending}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#1e3a5f' }}>
              {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear ejercicio'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Categoría</th>
                <th className="px-5 py-3 text-left">Equipamiento</th>
                <th className="px-5 py-3 text-left">Grupos musculares</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((ex) => (
                <tr key={ex.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{ex.name}</td>
                  <td className="px-5 py-3 text-gray-500">{CATEGORY_LABEL[ex.category as keyof typeof CATEGORY_LABEL] ?? ex.category}</td>
                  <td className="px-5 py-3 text-gray-500">{EQUIPMENT_LABEL[ex.equipment as keyof typeof EQUIPMENT_LABEL] ?? ex.equipment}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{ex.muscleGroups.slice(0, 3).join(', ')}{ex.muscleGroups.length > 3 ? '…' : ''}</td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(ex)} className="text-xs text-blue-500 hover:text-blue-700">Editar</button>
                    <button onClick={() => handleDelete(ex.id, ex.name)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                  {filter ? `Sin resultados para "${filter}"` : 'Sin ejercicios globales.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
