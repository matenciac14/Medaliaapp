'use client'

import { useState } from 'react'
import { mockProgressData } from '@/lib/mock/nutrition-data'

// ─── Constantes ──────────────────────────────────────────────────────────────

const WEEK_LABELS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5']

const PHASE_FOR_WEEK: Record<number, { label: string; color: string }> = {
  1: { label: 'BASE', color: 'bg-[#1e3a5f]' },
  2: { label: 'BASE', color: 'bg-[#1e3a5f]' },
  3: { label: 'BASE', color: 'bg-[#1e3a5f]' },
  4: { label: 'DESARROLLO', color: 'bg-[#22c55e]' },
  5: { label: 'DESARROLLO', color: 'bg-[#22c55e]' },
}

const TABS = ['Esta semana', 'Último mes', 'Todo el plan'] as const
type Tab = typeof TABS[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adherenceColor(pct: number) {
  if (pct >= 70) return 'bg-[#22c55e]'
  if (pct >= 40) return 'bg-yellow-400'
  return 'bg-red-400'
}

function hrColor(bpm: number) {
  return bpm <= 56 ? 'bg-[#22c55e]' : 'bg-yellow-400'
}

// Normaliza un valor entre min y max a px dentro de un contenedor de 120px height
function barHeight(value: number, min: number, max: number, maxPx = 120): number {
  const range = max - min
  if (range === 0) return maxPx
  return Math.max(16, Math.round(((value - min) / range) * maxPx))
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</p>
        {children}
      </div>
    </div>
  )
}

// ─── Gráfica 1: Peso — línea con puntos ──────────────────────────────────────

function WeightChart() {
  const data = mockProgressData
  const weights = data.map((d) => d.weightKg)
  const minW = Math.min(...weights) - 0.5
  const maxW = Math.max(...weights) + 0.5
  const CHART_H = 120
  const CHART_W_PCT = 100 / (data.length - 1)

  const points = data.map((d, i) => {
    const x = i * CHART_W_PCT
    const y = CHART_H - barHeight(d.weightKg, minW, maxW, CHART_H)
    return { x, y, d }
  })

  const start = data[0].weightKg
  const current = data[data.length - 1].weightKg
  const goal = 88
  const dropped = start - current
  const total = start - goal
  const pct = Math.round((dropped / total) * 100)

  return (
    <SectionCard title="Peso corporal">
      {/* Stat summary */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[100px] bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#1e3a5f]">{current} kg</p>
          <p className="text-xs text-gray-500 mt-0.5">Actual</p>
        </div>
        <div className="flex-1 min-w-[100px] bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#22c55e]">{goal} kg</p>
          <p className="text-xs text-gray-500 mt-0.5">Objetivo</p>
        </div>
        <div className="flex-1 min-w-[100px] bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#f97316]">-{dropped.toFixed(1)} kg</p>
          <p className="text-xs text-gray-500 mt-0.5">Bajado</p>
        </div>
      </div>

      {/* Chart: línea SVG-like con divs posicionados */}
      <div className="relative" style={{ height: `${CHART_H + 40}px` }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <div
            key={t}
            className="absolute left-0 right-0 border-t border-gray-100"
            style={{ top: `${t * CHART_H}px` }}
          />
        ))}

        {/* Connecting lines entre puntos */}
        {points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1]
          const dx = (next.x - pt.x) / 100
          const dy = next.y - pt.y
          const len = Math.sqrt(Math.pow(dx * 100 * 4, 2) + Math.pow(dy, 2)) // approx
          const angle = Math.atan2(dy, (next.x - pt.x) * 4) * (180 / Math.PI)
          return (
            <div
              key={i}
              className="absolute h-0.5 bg-[#1e3a5f]/40 origin-left"
              style={{
                left: `${pt.x}%`,
                top: `${pt.y}px`,
                width: `${CHART_W_PCT}%`,
                transform: `rotate(${angle}deg)`,
              }}
            />
          )
        })}

        {/* Puntos */}
        {points.map((pt, i) => (
          <div
            key={i}
            className="absolute flex flex-col items-center"
            style={{ left: `${pt.x}%`, top: `${pt.y}px`, transform: 'translate(-50%, -50%)' }}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                i === points.length - 1 ? 'bg-[#f97316] w-4 h-4' : 'bg-[#1e3a5f]'
              }`}
            />
          </div>
        ))}

        {/* Labels eje X */}
        {points.map((pt, i) => (
          <div
            key={`lbl-${i}`}
            className="absolute text-center"
            style={{ left: `${pt.x}%`, top: `${CHART_H + 10}px`, transform: 'translateX(-50%)' }}
          >
            <p className="text-[10px] text-gray-400">{WEEK_LABELS[i]}</p>
            <p className="text-[11px] font-semibold text-gray-700">{pt.d.weightKg}</p>
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Has bajado {dropped.toFixed(1)} kg de {total} kg objetivo</span>
          <span className="font-semibold text-[#22c55e]">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#22c55e] rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Gráfica 2: FC en reposo — barras verticales ─────────────────────────────

function HRChart() {
  const data = mockProgressData
  const maxHR = Math.max(...data.map((d) => d.hrResting))
  const avg = (data.reduce((s, d) => s + d.hrResting, 0) / data.length).toFixed(1)

  return (
    <SectionCard title="FC en reposo (bpm)">
      <div className="flex items-end gap-2 h-32 mb-2">
        {data.map((d, i) => {
          const h = Math.round((d.hrResting / maxHR) * 110)
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-semibold text-gray-600">{d.hrResting}</span>
              <div
                className={`w-full rounded-t-md transition-all ${hrColor(d.hrResting)}`}
                style={{ height: `${h}px` }}
              />
              <span className="text-[9px] text-gray-400">{WEEK_LABELS[i]}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#22c55e] inline-block" />
          <span className="text-gray-500">≤56 bpm (excelente)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />
          <span className="text-gray-500">&gt;56 bpm</span>
        </div>
        <span className="ml-auto font-semibold text-[#22c55e]">Promedio: {avg} bpm ✓</span>
      </div>
    </SectionCard>
  )
}

// ─── Gráfica 3: Km semanales — barras verticales ─────────────────────────────

function KmChart() {
  const data = mockProgressData
  const maxKm = Math.max(...data.map((d) => d.kmRun))
  const total = data.reduce((s, d) => s + d.kmRun, 0)

  return (
    <SectionCard title="Km semanales">
      <div className="flex items-end gap-2 h-32 mb-2">
        {data.map((d, i) => {
          const h = maxKm === 0 ? 8 : Math.max(8, Math.round((d.kmRun / maxKm) * 110))
          const phase = PHASE_FOR_WEEK[d.week]
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-semibold text-gray-600">{d.kmRun}</span>
              <div
                className={`w-full rounded-t-md transition-all ${phase.color}`}
                style={{ height: `${h}px` }}
              />
              <span className="text-[9px] text-gray-400">{WEEK_LABELS[i]}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#1e3a5f] inline-block" />
          <span className="text-gray-500">BASE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#22c55e] inline-block" />
          <span className="text-gray-500">DESARROLLO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#f97316] inline-block" />
          <span className="text-gray-500">ESPECÍFICO</span>
        </div>
        <span className="ml-auto font-semibold text-gray-700">Total: {total} km</span>
      </div>
    </SectionCard>
  )
}

// ─── Gráfica 4: Adherencia — barras horizontales ─────────────────────────────

function AdherenceChart() {
  const data = mockProgressData.filter((d) => d.adherencePct > 0)
  const avg = Math.round(data.reduce((s, d) => s + d.adherencePct, 0) / data.length)

  return (
    <SectionCard title="Adherencia al plan">
      <div className="space-y-2.5 mb-4">
        {mockProgressData.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-12 shrink-0">{WEEK_LABELS[i]}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
              {d.adherencePct === 0 ? (
                <span className="absolute inset-0 flex items-center pl-2.5 text-[10px] text-gray-400">Inicio del plan</span>
              ) : (
                <div
                  className={`h-full rounded-full flex items-center justify-end pr-2 transition-all ${adherenceColor(d.adherencePct)}`}
                  style={{ width: `${d.adherencePct}%` }}
                >
                  <span className="text-[10px] font-bold text-white">{d.adherencePct}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#22c55e] inline-block" />
            <span className="text-gray-500">≥70%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />
            <span className="text-gray-500">40-70%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
            <span className="text-gray-500">&lt;40%</span>
          </div>
        </div>
        <span className="text-sm font-bold text-[#22c55e]">Promedio: {avg}%</span>
      </div>
    </SectionCard>
  )
}

// ─── Card 5: Benchmarks ───────────────────────────────────────────────────────

function BenchmarksCard() {
  const benchmarks = [
    { label: 'Test 5 km', week: 4, status: 'pending' as const },
    { label: 'Test 10 km', week: 8, status: 'pending' as const },
    { label: 'Simulacro 16 km', week: 14, status: 'pending' as const },
  ]

  return (
    <SectionCard title="Benchmarks del plan">
      <div className="space-y-0 -mx-5 -mb-4">
        {benchmarks.map((b, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between px-5 py-3.5 ${
              idx < benchmarks.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{b.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">Semana {b.week}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">
              ⏳ Pendiente
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Todo el plan')
  const currentWeek = mockProgressData.length
  const totalWeeks = 18

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mi progreso</h1>
          <p className="text-sm text-gray-500 mt-0.5">Seguimiento de tu plan de 18 semanas</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1e3a5f] text-white">
          Semana {currentWeek} de {totalWeeks}
        </span>
      </div>

      {/* Barra de progreso global del plan */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Progreso del plan</span>
          <span className="font-semibold text-[#1e3a5f]">{Math.round((currentWeek / totalWeeks) * 100)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1e3a5f] rounded-full"
            style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
          <span>Inicio</span>
          <span>Semana 9 · Medio</span>
          <span>Semana 18 · Meta</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-[#1e3a5f] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Graficas */}
      <WeightChart />
      <HRChart />
      <KmChart />
      <AdherenceChart />
      <BenchmarksCard />

    </div>
  )
}
