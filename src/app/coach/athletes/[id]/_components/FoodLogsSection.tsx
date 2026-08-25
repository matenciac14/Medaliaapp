'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type FoodLogEntry = {
  id: string
  date: string
  mealType: string
  grams: number
  kcalLogged: number | null
  proteinLogged: number | null
  carbsLogged: number | null
  fatLogged: number | null
  food: { name: string }
}

type NutritionPlanData = {
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
} | null

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH:     'Almuerzo',
  DINNER:    'Cena',
  SNACK:     'Snack',
  PRE:       'Pre-entreno',
  POST:      'Post-entreno',
}

function adherenceColor(pct: number | null): string {
  if (pct == null) return '#9ca3af'
  if (pct >= 90) return '#16a34a'
  if (pct >= 70) return '#ea580c'
  return '#dc2626'
}

type ProposeFormState = {
  message: string
  deltaKcal: string
  deltaProtein: string
  deltaCarbs: string
  deltaFat: string
}

function ProposeModal({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState<ProposeFormState>({
    message: '', deltaKcal: '0', deltaProtein: '0', deltaCarbs: '0', deltaFat: '0',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/coach/athletes/${athleteId}/nutrition/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:      form.message,
        deltaKcal:    parseInt(form.deltaKcal) || 0,
        deltaProtein: parseInt(form.deltaProtein) || 0,
        deltaCarbs:   parseInt(form.deltaCarbs) || 0,
        deltaFat:     parseInt(form.deltaFat) || 0,
      }),
    })
    setLoading(false)
    if (!res.ok) { setError('Error al enviar. Intenta nuevamente.'); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Proponer ajuste nutricional</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <p className="text-xs text-gray-500">El atleta recibirá esta propuesta y podrá aceptarla o rechazarla.</p>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje al atleta *</label>
          <textarea
            required
            minLength={10}
            maxLength={300}
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Ej: Esta semana aumenta 30g de proteína — tu déficit calórico es muy alto."
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['deltaKcal', 'Calorías (kcal)', 'deltaKcal'],
            ['deltaProtein', 'Proteína (g)', 'deltaProtein'],
            ['deltaCarbs', 'Carbohidratos (g)', 'deltaCarbs'],
            ['deltaFat', 'Grasas (g)', 'deltaFat'],
          ] as [keyof ProposeFormState, string, keyof ProposeFormState][]).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {loading ? 'Enviando...' : 'Enviar propuesta'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function FoodLogsSection({
  foodLogs,
  nutritionPlan,
  loaded,
  athleteId,
}: {
  foodLogs: FoodLogEntry[]
  nutritionPlan: NutritionPlanData
  loaded: boolean
  athleteId: string
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showPropose, setShowPropose] = useState(false)

  if (!loaded) {
    return <p className="text-sm text-gray-400">Cargando...</p>
  }

  if (foodLogs.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        El atleta no ha registrado alimentos en los últimos 7 días.
      </p>
    )
  }

  // Agrupar por fecha
  const byDate = new Map<string, { kcal: number; protein: number; carbs: number; fat: number; logs: FoodLogEntry[] }>()
  for (const log of foodLogs) {
    const key = log.date.slice(0, 10)
    const prev = byDate.get(key) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, logs: [] }
    byDate.set(key, {
      kcal:    prev.kcal    + (log.kcalLogged    ?? 0),
      protein: prev.protein + (log.proteinLogged ?? 0),
      carbs:   prev.carbs   + (log.carbsLogged   ?? 0),
      fat:     prev.fat     + (log.fatLogged     ?? 0),
      logs:    [...prev.logs, log],
    })
  }

  const avgTargetKcal = nutritionPlan
    ? Math.round((nutritionPlan.targetKcalHard + nutritionPlan.targetKcalEasy + nutritionPlan.targetKcalRest) / 3)
    : null

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {showPropose && <ProposeModal athleteId={athleteId} onClose={() => setShowPropose(false)} />}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Últimos 7 días</p>
        <button
          onClick={() => setShowPropose(true)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          + Proponer ajuste
        </button>
      </div>

      <div className="space-y-1">
      {Array.from(byDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([dateKey, day]) => {
          const pct = avgTargetKcal && day.kcal > 0
            ? Math.round((day.kcal / avgTargetKcal) * 100)
            : null
          const color = adherenceColor(pct)
          const isOpen = expanded.has(dateKey)

          return (
            <div key={dateKey} className="border border-gray-100 rounded-lg overflow-hidden">
              {/* Fila resumen del día — clickeable */}
              <button
                onClick={() => toggle(dateKey)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-xs text-gray-400 w-20 shrink-0">
                  {new Date(dateKey + 'T12:00:00').toLocaleDateString('es-CO', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </span>
                <div className="flex-1 flex items-center gap-3 flex-wrap text-xs">
                  <span className="font-semibold" style={{ color }}>
                    {Math.round(day.kcal)} kcal
                    {pct != null && (
                      <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
                    )}
                  </span>
                  <span className="text-gray-500">P: {Math.round(day.protein)}g</span>
                  <span className="text-gray-500">C: {Math.round(day.carbs)}g</span>
                  <span className="text-gray-500">G: {Math.round(day.fat)}g</span>
                  <span className="text-gray-400">{day.logs.length} registros</span>
                </div>
                <span className="text-gray-300 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Detalle expandible — alimentos individuales */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                  {day.logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                      <span className="w-20 shrink-0 text-gray-400">
                        {MEAL_LABELS[log.mealType] ?? log.mealType}
                      </span>
                      <span className="flex-1 text-gray-700 font-medium truncate">
                        {log.food.name}
                      </span>
                      <span className="text-gray-400 shrink-0">{log.grams}g</span>
                      <span className="text-gray-500 shrink-0 w-16 text-right">
                        {Math.round(log.kcalLogged ?? 0)} kcal
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

      {avgTargetKcal && (
        <p className="text-xs text-gray-400 pt-1">
          Target promedio: {avgTargetKcal} kcal/día
        </p>
      )}
      </div>
    </div>
  )
}
