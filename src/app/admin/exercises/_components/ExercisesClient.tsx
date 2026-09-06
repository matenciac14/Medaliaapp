'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { validateExercise } from '@/domain/admin/exercise'
import { translateBodyPart, translateTarget } from '@/lib/gym/labels'

type Exercise = {
  id: string
  name: string
  bodyPart: string
  target: string
  equipment: string
  mechanic: string | null
  description: string | null
  gifUrl: string | null
  source: string
}

type FormState = {
  name: string
  bodyPart: string
  target: string
  equipment: string
  mechanic: string
  description: string
  gifUrl: string
}

const EMPTY_FORM: FormState = {
  name: '', bodyPart: '', target: '', equipment: '',
  mechanic: '', description: '', gifUrl: '',
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
    setForm({
      name: ex.name,
      bodyPart: ex.bodyPart,
      target: ex.target,
      equipment: ex.equipment,
      mechanic: ex.mechanic ?? '',
      description: ex.description ?? '',
      gifUrl: ex.gifUrl ?? '',
    })
    setErrors([])
    setEditing(ex)
    setCreating(false)
  }
  function closeForm() { setCreating(false); setEditing(null); setErrors([]) }

  function parsedForm() {
    return {
      name: form.name,
      bodyPart: form.bodyPart,
      target: form.target,
      equipment: form.equipment,
      mechanic: form.mechanic || null,
      description: form.description || null,
      gifUrl: form.gifUrl || null,
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
      setExercises((prev) => [...prev, { ...data, id: json.exercise.id, source: 'manual' }])
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
    ? exercises.filter((e) =>
        e.name.toLowerCase().includes(filter.toLowerCase()) ||
        e.bodyPart.toLowerCase().includes(filter.toLowerCase()) ||
        e.target.toLowerCase().includes(filter.toLowerCase())
      )
    : exercises

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20'

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre, parte del cuerpo o músculo…"
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
                className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Parte del cuerpo * <span className="text-gray-400 font-normal">(ej. upper legs)</span>
              </label>
              <input value={form.bodyPart} onChange={(e) => setForm((f) => ({ ...f, bodyPart: e.target.value }))}
                placeholder="upper legs"
                className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Músculo objetivo * <span className="text-gray-400 font-normal">(ej. quads)</span>
              </label>
              <input value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                placeholder="quads"
                className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Equipamiento * <span className="text-gray-400 font-normal">(ej. barbell)</span>
              </label>
              <input value={form.equipment} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
                placeholder="barbell"
                className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Mecánica <span className="text-gray-400 font-normal">(ej. compound)</span>
              </label>
              <input value={form.mechanic} onChange={(e) => setForm((f) => ({ ...f, mechanic: e.target.value }))}
                placeholder="compound"
                className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">URL del GIF</label>
              <input value={form.gifUrl} onChange={(e) => setForm((f) => ({ ...f, gifUrl: e.target.value }))}
                placeholder="https://..."
                className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
                <th className="px-5 py-3 text-left">Parte del cuerpo</th>
                <th className="px-5 py-3 text-left">Músculo</th>
                <th className="px-5 py-3 text-left">Equipamiento</th>
                <th className="px-5 py-3 text-left">Fuente</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((ex) => (
                <tr key={ex.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{ex.name}</td>
                  <td className="px-5 py-3 text-gray-500">{translateBodyPart(ex.bodyPart)}</td>
                  <td className="px-5 py-3 text-gray-500">{translateTarget(ex.target)}</td>
                  <td className="px-5 py-3 text-gray-500">{ex.equipment}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ex.source === 'workoutx' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {ex.source}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(ex)} className="text-xs text-blue-500 hover:text-blue-700">Editar</button>
                    <button onClick={() => handleDelete(ex.id, ex.name)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
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
