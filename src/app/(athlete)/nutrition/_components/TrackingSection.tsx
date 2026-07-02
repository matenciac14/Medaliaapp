'use client'

import { useState, useEffect, useCallback } from 'react'
import LogFoodModal from './LogFoodModal'
import type { FoodItem } from './types'

type MacroTotals = { kcal: number; proteinG: number; carbsG: number; fatG: number }

type FoodLogEntry = {
  id: string
  grams: number
  mealType: string
  food: { name: string; kcalPer100g: number }
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

type Props = {
  target: MacroTotals | null
  foods: FoodItem[]
  date?: string
}

const MACRO_CONFIG = [
  { key: 'kcal'     as const, label: 'Calorías', unit: 'kcal', color: '#f97316', bg: 'bg-orange-100 text-orange-700' },
  { key: 'proteinG' as const, label: 'Proteína', unit: 'g',    color: '#3b82f6', bg: 'bg-blue-100 text-blue-700'     },
  { key: 'carbsG'   as const, label: 'Carbos',   unit: 'g',    color: '#eab308', bg: 'bg-yellow-100 text-yellow-700' },
  { key: 'fatG'     as const, label: 'Grasas',   unit: 'g',    color: '#22c55e', bg: 'bg-green-100 text-green-700'   },
]

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const over = max > 0 && value > max
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color }}
      />
    </div>
  )
}

export default function TrackingSection({ target, foods, date }: Props) {
  const [expanded, setExpanded]       = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [logs, setLogs]               = useState<FoodLogEntry[]>([])
  const [totals, setTotals]           = useState<MacroTotals>({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })
  const [loading, setLoading]         = useState(false)
  const [refreshKey, setRefreshKey]   = useState(0)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const param = date ? `?date=${date}` : ''
      const res = await fetch(`/api/nutrition/log${param}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs ?? [])
        setTotals(data.totals ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 })
      }
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs, refreshKey])

  function handleModalClose() {
    setShowModal(false)
    setRefreshKey(k => k + 1)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/nutrition/log/${id}`, { method: 'DELETE' })
      setRefreshKey(k => k + 1)
    } finally {
      setDeletingId(null)
    }
  }

  const consumed = totals.kcal
  const targetKcal = target?.kcal ?? 0
  const pct = targetKcal > 0 ? Math.min(Math.round((consumed / targetKcal) * 100), 999) : 0

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header — siempre visible */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-start">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lo que comí hoy</span>
              {loading ? (
                <span className="text-xs text-gray-400">Cargando...</span>
              ) : (
                <span className="text-sm font-bold text-gray-900">
                  <span className="text-orange-500">{consumed}</span>
                  {target ? ` / ${targetKcal} kcal` : ' kcal'}
                  {target && pct > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">{pct}%</span>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{logs.length} {logs.length === 1 ? 'registro' : 'registros'}</span>
            <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Barra kcal rápida */}
        {!expanded && target && (
          <div className="px-5 pb-4">
            <ProgressBar value={consumed} max={targetKcal} color="#f97316" />
          </div>
        )}

        {/* Expanded */}
        {expanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">

            {/* 4 barras de macros */}
            <div className="space-y-3">
              {MACRO_CONFIG.map(m => {
                const val = totals[m.key] ?? 0
                const tgt = target?.[m.key] ?? 0
                const p   = tgt > 0 ? Math.min(Math.round((val / tgt) * 100), 999) : 0
                return (
                  <div key={m.key}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-medium text-gray-700">{m.label}</span>
                      <span className="text-xs font-semibold text-gray-700">
                        <span style={{ color: m.color }}>{val}{m.unit}</span>
                        {target ? ` / ${tgt}${m.unit}` : ''}
                        {target && p > 0 && <span className="text-gray-400 font-normal ml-1">{p}%</span>}
                      </span>
                    </div>
                    <ProgressBar value={val} max={tgt} color={m.color} />
                    {target && tgt > 0 && val < tgt && (
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        Faltan {Math.round(tgt - val)}{m.unit}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Lista de logs */}
            {logs.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="h-px bg-gray-100" />
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between group">
                    <span className="text-sm text-gray-700 truncate flex-1">{log.food.name}</span>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className="text-xs text-gray-400">
                        {log.grams}g · {log.kcal} kcal
                      </span>
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors text-xs leading-none"
                        aria-label="Eliminar registro"
                      >
                        {deletingId === log.id ? '…' : '✕'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {logs.length === 0 && !loading && (
              <p className="text-xs text-gray-400 text-center py-2">Sin registros aún — agrega tu primera comida</p>
            )}

            {/* Botón registrar */}
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold hover:bg-[#162d4a] transition-colors"
            >
              + Registrar comida
            </button>
          </div>
        )}

        {/* Botón compacto cuando está colapsado */}
        {!expanded && (
          <div className="px-5 pb-4 -mt-1">
            <button
              onClick={e => { e.stopPropagation(); setShowModal(true) }}
              className="text-xs font-semibold text-[#1e3a5f] hover:underline"
            >
              + Registrar
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <LogFoodModal foods={foods} date={date} onClose={handleModalClose} />
      )}
    </>
  )
}
