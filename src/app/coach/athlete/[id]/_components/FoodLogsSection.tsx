'use client'

import { useState } from 'react'

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

export function FoodLogsSection({
  foodLogs,
  nutritionPlan,
  loaded,
}: {
  foodLogs: FoodLogEntry[]
  nutritionPlan: NutritionPlanData
  loaded: boolean
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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
  )
}
