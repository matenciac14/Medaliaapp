'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeightPoint = { week: number; kg: number }
export type HrPoint = { week: number; bpm: number }
export type WellbeingPoint = {
  week: number
  energyLevel: number | null
  stressLevel: number | null
  motivationLevel: number | null
}
export type WeekData = {
  weekNumber: number
  phase: string
  volumeKm: number
  adherencePct: number
}

export type BenchmarkPoint = {
  id: string
  sport: string
  metric: string
  value: number
  unit: string
  testedAt: string
  notes?: string | null
}

export type GymPR = {
  id: string
  exerciseName: string
  weightKg: number | null
  repsCompleted: number | null
  date: string
}

export type HistoryItem = {
  id: string
  date: string
  type: 'run' | 'gym'
  label: string
  durationMin: number | null
  distanceKm?: number | null
  rpe?: number | null
}

export type MeasurementPoint = {
  week: number
  waistCm: number | null
  armsCm: number | null
  hipsCm: number | null
  thighsCm: number | null
}

export type ProgressClientProps = {
  weightCheckins: WeightPoint[]
  hrCheckins: HrPoint[]
  wellbeingData: WellbeingPoint[]
  weeks: WeekData[]
  weightGoal: number | null
  benchmarks: BenchmarkPoint[]
  gymPRs: GymPR[]
  recentActivity: HistoryItem[]
  measurementCheckins: MeasurementPoint[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Running', STRENGTH: 'Fuerza',
  CYCLING: 'Ciclismo', SWIMMING: 'Natación', TRIATHLON: 'Triatlón',
}

const METRIC_LABELS: Record<string, string> = {
  '5K_TIME': '5K', '10K_TIME': '10K', 'HALF_MARATHON_TIME': 'Media Maratón',
  'MARATHON_TIME': 'Maratón', 'FTP_WATTS': 'FTP', 'CSS_PACE': 'CSS Pace',
  '1RM_SQUAT': '1RM Sentadilla', '1RM_DEADLIFT': '1RM Peso muerto', '1RM_BENCH': '1RM Press banca',
}

function formatBenchmarkValue(value: number, unit: string): string {
  if (unit === 'seconds') {
    const h = Math.floor(value / 3600)
    const m = Math.floor((value % 3600) / 60)
    const s = Math.round(value % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }
  if (unit === 'watts') return `${value} W`
  if (unit === 'kg') return `${value} kg`
  return String(value)
}

const PHASE_BAR_COLOR: Record<string, string> = {
  BASE: '#1e3a5f',
  DESARROLLO: '#ea580c',
  ESPECIFICO: '#dc2626',
  AFINAMIENTO: '#7c3aed',
}

// Normaliza acentos para lookup en los mapas de fase (la DB puede guardar ESPECÍFICO o ESPECIFICO)
function normalizePhase(phase: string): string {
  return phase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

const PHASE_BADGE: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  DESARROLLO: 'bg-orange-100 text-orange-800',
  ESPECIFICO: 'bg-red-100 text-red-800',
  AFINAMIENTO: 'bg-purple-100 text-purple-800',
}

const PHASE_LABEL: Record<string, string> = {
  BASE: 'BASE',
  DESARROLLO: 'DESARROLLO',
  ESPECIFICO: 'ESPECÍFICO',
  AFINAMIENTO: 'AFINAMIENTO',
}

function adherenceBarColor(pct: number): string {
  if (pct >= 70) return '#16a34a'
  if (pct >= 40) return '#d97706'
  return '#dc2626'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden card-hover">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function TrendBadge({
  start,
  end,
  lowerIsBetter = false,
  unit = '',
}: {
  start: number
  end: number
  lowerIsBetter?: boolean
  unit?: string
}) {
  const delta = Math.abs(end - start).toFixed(1)
  const improved = lowerIsBetter ? end < start : end > start
  const worsened = lowerIsBetter ? end > start : end < start

  if (improved)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a]">
        <TrendingDown size={13} /> -{delta}{unit}
      </span>
    )
  if (worsened)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#dc2626]">
        <TrendingUp size={13} /> +{delta}{unit}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400">
      <Minus size={13} /> sin cambio
    </span>
  )
}

function LineChart<T extends { week: number }>({
  data,
  getValue,
  color,
  unit,
  goalLine,
  minVal,
  maxVal,
}: {
  data: T[]
  getValue: (d: T) => number
  color: string
  unit: string
  goalLine?: number
  minVal: number
  maxVal: number
}) {
  const W = 600
  const H = 120
  const PAD_X = 8
  const PAD_Y = 12
  const range = maxVal - minVal || 1
  const n = data.length

  function toX(i: number) {
    return n <= 1 ? W / 2 : PAD_X + (i / (n - 1)) * (W - PAD_X * 2)
  }
  function toY(val: number) {
    return PAD_Y + (1 - (val - minVal) / range) * (H - PAD_Y * 2)
  }

  const points = data.map((d, i) => ({ x: toX(i), y: toY(getValue(d)), val: getValue(d), week: d.week }))
  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = n > 1
    ? `M${points[0].x.toFixed(1)},${H} ` +
      points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${points[n - 1].x.toFixed(1)},${H} Z`
    : ''

  const goalY = goalLine !== undefined ? toY(goalLine) : null

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }} overflow="visible">
        {/* área bajo la curva */}
        {areaPath && (
          <path d={areaPath} fill={color} fillOpacity={0.08} />
        )}
        {/* línea de meta */}
        {goalY !== null && (
          <g>
            <line
              x1={PAD_X} y1={goalY} x2={W - PAD_X} y2={goalY}
              stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5,4" opacity={0.7}
            />
            <text x={W - PAD_X + 4} y={goalY + 4} fontSize={9} fill="#16a34a" fontWeight="600">
              Meta
            </text>
          </g>
        )}
        {/* línea principal */}
        {n > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {/* puntos */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill="white" stroke={color} strokeWidth={2} />
            <title>{`Sem ${p.week}: ${p.val}${unit}`}</title>
          </g>
        ))}
        {/* etiquetas inicio y fin */}
        {n > 0 && (
          <>
            <text x={points[0].x} y={points[0].y - 8} textAnchor="middle" fontSize={10} fill={color} fontWeight="700">
              {points[0].val}{unit}
            </text>
            {n > 1 && (
              <text x={points[n-1].x} y={points[n-1].y - 8} textAnchor="middle" fontSize={10} fill={color} fontWeight="700">
                {points[n-1].val}{unit}
              </text>
            )}
          </>
        )}
      </svg>
      {/* eje X — semanas */}
      <div className="flex justify-between mt-1 px-1">
        {data.map((d, i) => (
          (i === 0 || i === Math.floor((n - 1) / 2) || i === n - 1) && (
            <span key={d.week} className="text-[9px] text-gray-400">S{d.week}</span>
          )
        ))}
      </div>
    </div>
  )
}

function HorizontalKmChart({ data }: { data: WeekData[] }) {
  const maxKm = Math.max(...data.map((w) => w.volumeKm), 1)
  return (
    <div className="space-y-2">
      {data.map((w) => {
        const widthPct = Math.round((w.volumeKm / maxKm) * 100)
        const color = PHASE_BAR_COLOR[normalizePhase(w.phase)] ?? '#1e3a5f'
        return (
          <div key={w.weekNumber} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-5 shrink-0">S{w.weekNumber}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              />
              <span className="absolute right-1.5 top-0 bottom-0 flex items-center text-[10px] font-semibold text-gray-600">
                {w.volumeKm} km
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AdherenceVerticalChart({ data }: { data: WeekData[] }) {
  const CHART_H = 80
  return (
    <div>
      <div className="flex items-end gap-1 overflow-x-auto" style={{ height: `${CHART_H}px` }}>
        {data.map((w) => {
          const pct = w.adherencePct
          const barH = Math.max(4, Math.round((pct / 100) * CHART_H))
          const color = adherenceBarColor(pct)
          return (
            <div
              key={w.weekNumber}
              title={`Sem ${w.weekNumber}: ${pct}%`}
              className="flex flex-col items-center flex-1 min-w-[20px] group cursor-default"
              style={{ height: `${CHART_H}px`, justifyContent: 'flex-end' }}
            >
              <span className="text-[9px] font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
                {pct}%
              </span>
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${barH}px`, backgroundColor: color, opacity: 0.88 }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex gap-1 mt-1 overflow-x-auto">
        {data.map((w) => (
          <div key={w.weekNumber} className="flex-1 min-w-[20px] text-center">
            <span className="text-[9px] text-gray-400">S{w.weekNumber}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
        {([
          { color: '#16a34a', label: '≥70% Buena' },
          { color: '#d97706', label: '40-69% Regular' },
          { color: '#dc2626', label: '<40% Baja' },
        ] as const).map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Wellbeing ────────────────────────────────────────────────────────────────

function WellbeingChart({ data }: { data: WellbeingPoint[] }) {
  const rows = [
    { key: 'energyLevel' as const, label: 'Energía', color: '#ea580c' },
    { key: 'motivationLevel' as const, label: 'Motivación', color: '#22c55e' },
    { key: 'stressLevel' as const, label: 'Estrés', color: '#8b5cf6' },
  ]

  return (
    <div className="space-y-4">
      {rows.map(({ key, label, color }) => {
        const points = data.filter(d => d[key] != null) as (WellbeingPoint & Record<string, number>)[]
        if (points.length === 0) return null
        const avg = Math.round(points.reduce((s, p) => s + (p[key] as number), 0) / points.length * 10) / 10
        const latest = points[points.length - 1][key] as number
        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-semibold text-gray-700">{label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Prom. {avg}/10</span>
                <span className="text-sm font-bold" style={{ color }}>{latest}/10</span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(latest / 10) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        )
      })}

      {data.length > 1 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 mb-2">Historial por semana</p>
          <div className="flex gap-2 flex-wrap">
            {data.slice(-8).map((p, i) => (
              <div key={i} className="text-center">
                <div className="flex flex-col gap-0.5 mb-0.5">
                  {p.energyLevel != null && <div className="w-5 h-1.5 rounded-full mx-auto" style={{ backgroundColor: '#ea580c', opacity: p.energyLevel / 10 + 0.2 }} />}
                  {p.motivationLevel != null && <div className="w-5 h-1.5 rounded-full mx-auto" style={{ backgroundColor: '#22c55e', opacity: p.motivationLevel / 10 + 0.2 }} />}
                  {p.stressLevel != null && <div className="w-5 h-1.5 rounded-full mx-auto" style={{ backgroundColor: '#8b5cf6', opacity: p.stressLevel / 10 + 0.2 }} />}
                </div>
                <span className="text-[9px] text-gray-400">S{p.week}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Measurements ─────────────────────────────────────────────────────────────

const MEASUREMENT_ROWS = [
  { key: 'waistCm'  as const, label: 'Cintura',  color: '#6366f1' },
  { key: 'armsCm'   as const, label: 'Brazos',   color: '#ea580c' },
  { key: 'hipsCm'   as const, label: 'Cadera',   color: '#ec4899' },
  { key: 'thighsCm' as const, label: 'Muslos',   color: '#14b8a6' },
]

function MeasurementsChart({ data }: { data: MeasurementPoint[] }) {
  const rows = MEASUREMENT_ROWS.map(({ key, label, color }) => {
    const points = data
      .filter(d => d[key] != null)
      .map(d => ({ week: d.week, val: d[key] as number }))
    return { key, label, color, points }
  }).filter(r => r.points.length > 0)

  if (rows.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-4">Sin medidas registradas aún.</p>
  )

  return (
    <div className="space-y-6">
      {rows.map(({ key, label, color, points }) => {
        const start = points[0].val
        const end = points[points.length - 1].val
        const minVal = Math.min(...points.map(p => p.val)) - 1
        const maxVal = Math.max(...points.map(p => p.val)) + 1
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">{label}</span>
              <div className="flex items-center gap-3">
                <TrendBadge start={start} end={end} lowerIsBetter unit=" cm" />
                <span className="text-base font-bold" style={{ color }}>{end} cm</span>
              </div>
            </div>
            <LineChart
              data={points}
              getValue={d => d.val}
              color={color}
              unit=" cm"
              minVal={minVal}
              maxVal={maxVal}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Periods ──────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '4 sem',  weeks: 4 },
  { label: '8 sem',  weeks: 8 },
  { label: '12 sem', weeks: 12 },
] as const

type Period = 4 | 8 | 12

// ─── Main Client Component ────────────────────────────────────────────────────

export default function ProgressClient({
  weightCheckins,
  hrCheckins,
  wellbeingData,
  weeks,
  weightGoal,
  benchmarks,
  gymPRs,
  recentActivity,
  measurementCheckins,
}: ProgressClientProps) {
  const [period, setPeriod] = useState<Period>(12)

  const weightData        = weightCheckins.slice(-period)
  const hrData            = hrCheckins.slice(-period)
  const wellbeingSlice    = wellbeingData.slice(-period)
  const weekData          = weeks.slice(0, period)
  const measurementSlice  = measurementCheckins.slice(-period)

  // Guard: si no hay datos suficientes, mostrar mensaje
  if (weightData.length === 0 && hrData.length === 0) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <span>←</span> Volver al inicio
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mi Progreso</h1>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-500 text-sm">Aún no hay check-ins registrados. Completa tu primer check-in semanal para ver tu progreso aquí.</p>
        </div>
      </div>
    )
  }

  const weightStart = weightData.length > 0 ? weightData[0].kg : null
  const weightEnd   = weightData.length > 0 ? weightData[weightData.length - 1].kg : null
  const hrStart     = hrData.length > 0 ? hrData[0].bpm : null
  const hrEnd       = hrData.length > 0 ? hrData[hrData.length - 1].bpm : null

  const weightMin = weightData.length > 0 ? Math.min(...weightData.map((d) => d.kg)) - 0.5 : 0
  const weightMax = weightData.length > 0 ? Math.max(...weightData.map((d) => d.kg)) + 0.5 : 100
  const hrMin     = hrData.length > 0 ? Math.min(...hrData.map((d) => d.bpm)) - 1 : 40
  const hrMax     = hrData.length > 0 ? Math.max(...hrData.map((d) => d.bpm)) + 1 : 100

  const avgAdherence =
    weekData.length > 0
      ? Math.round(weekData.reduce((s, w) => s + w.adherencePct, 0) / weekData.length)
      : 0

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <span>←</span> Volver al inicio
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mi Progreso</h1>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(({ label, weeks: w }) => (
            <button
              key={w}
              onClick={() => setPeriod(w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                period === w
                  ? 'bg-[#1e3a5f] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Peso */}
      {weightData.length > 0 && (
      <SectionCard title="Peso (kg)">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-2xl font-bold text-gray-900">{weightEnd} kg</p>
              <p className="text-xs text-gray-500">Actual</p>
            </div>
            {weightStart != null && weightEnd != null && <TrendBadge start={weightStart} end={weightEnd} lowerIsBetter unit=" kg" />}
            {weightGoal ? (
              <div>
                <p className="text-sm font-semibold text-[#16a34a]">{weightGoal} kg</p>
                <p className="text-xs text-gray-500">Objetivo</p>
              </div>
            ) : (
              <Link href="/profile" className="text-xs text-[#ea580c] font-medium hover:underline">
                + Define tu meta de peso
              </Link>
            )}
          </div>
          {weightGoal && weightEnd != null ? (
            <span className="text-xs text-gray-500 font-medium">
              {weightEnd > weightGoal
                ? `Faltan ${(weightEnd - weightGoal).toFixed(1)} kg`
                : 'Objetivo alcanzado'}
            </span>
          ) : null}
        </div>

        <LineChart
          data={weightData}
          getValue={(d) => d.kg}
          color="#1e3a5f"
          unit=" kg"
          goalLine={weightGoal ?? undefined}
          minVal={weightMin}
          maxVal={weightMax}
        />
      </SectionCard>
      )}

      {/* FC Reposo */}
      {hrData.length > 0 && (
      <SectionCard title="FC Reposo (bpm)">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-2xl font-bold text-gray-900">{hrEnd} bpm</p>
              <p className="text-xs text-gray-500">Actual</p>
            </div>
            {hrStart != null && hrEnd != null && <TrendBadge start={hrStart} end={hrEnd} lowerIsBetter unit=" bpm" />}
            <div>
              <p className="text-sm font-semibold text-gray-600">{hrStart} bpm</p>
              <p className="text-xs text-gray-500">Inicio</p>
            </div>
          </div>
          {hrEnd != null && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              hrEnd <= 54
                ? 'bg-green-100 text-[#16a34a]'
                : hrEnd <= 58
                ? 'bg-yellow-100 text-[#d97706]'
                : 'bg-red-100 text-[#dc2626]'
            }`}
          >
            {hrEnd <= 54 ? 'Excelente' : hrEnd <= 58 ? 'Buena' : 'Normal'}
          </span>
          )}
        </div>

        <LineChart
          data={hrData}
          getValue={(d) => d.bpm}
          color="#dc2626"
          unit=" bpm"
          minVal={hrMin}
          maxVal={hrMax}
        />
      </SectionCard>
      )}

      {/* Bienestar */}
      {wellbeingSlice.length > 0 && (
        <SectionCard title="Bienestar — Últimas semanas">
          <WellbeingChart data={wellbeingSlice} />
        </SectionCard>
      )}

      {/* Circunferencias corporales */}
      {measurementSlice.length > 0 && (
        <SectionCard title="Circunferencias Corporales (cm)">
          <MeasurementsChart data={measurementSlice} />
        </SectionCard>
      )}

      {/* Km semanales */}
      {weekData.length > 0 && (
        <SectionCard title="Km Semanales por Fase">
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(PHASE_BAR_COLOR).map(([phase, color]) => (
                <div key={phase} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PHASE_BADGE[phase] ?? ''}`}>
                    {PHASE_LABEL[phase] ?? phase}
                  </span>
                </div>
              ))}
          </div>
          <HorizontalKmChart data={weekData} />
        </SectionCard>
      )}

      {/* Adherencia */}
      {weekData.length > 0 && (
        <SectionCard title={`Adherencia al Plan — Promedio ${avgAdherence}%`}>
          <AdherenceVerticalChart data={weekData} />
        </SectionCard>
      )}

      {/* Benchmarks */}
      <SectionCard title="Métricas Clave">
        {/* Mobile: cards */}
        <div className="sm:hidden space-y-3">
          {[
            ...(weightGoal !== null && weightEnd != null ? [{
              label: 'Peso vs objetivo',
              start: `${weightStart} kg`,
              end: `${weightEnd} kg`,
              status: weightEnd <= weightGoal ? 'logrado' : 'pendiente',
            }] : []),
            ...(hrStart != null && hrEnd != null ? [{
              label: 'FC Reposo',
              start: `${hrStart} bpm`,
              end: `${hrEnd} bpm`,
              status: hrEnd < hrStart ? 'mejorando' : hrEnd === hrStart ? 'igual' : 'empeorando',
            }] : []),
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{row.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{row.start} → <span className="font-semibold text-gray-700">{row.end}</span></p>
              </div>
              {row.status === 'mejorando' && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-[#16a34a] shrink-0">Mejorando</span>}
              {row.status === 'igual' && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">Sin cambio</span>}
              {row.status === 'empeorando' && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-[#dc2626] shrink-0">Empeorando</span>}
              {row.status === 'logrado' && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-[#16a34a] shrink-0">Logrado</span>}
              {row.status === 'pendiente' && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-[#ea580c] shrink-0">Pendiente</span>}
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Métrica', 'Inicio', 'Actual', 'Estado'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 last:pr-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {weightGoal !== null && weightEnd != null && (
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-900">Peso actual vs objetivo</td>
                  <td className="py-3 pr-4 text-gray-500">{weightStart} kg</td>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{weightEnd} kg</td>
                  <td className="py-3">
                    {weightEnd <= weightGoal
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-[#16a34a]">Logrado</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-[#ea580c]">Pendiente</span>}
                  </td>
                </tr>
              )}
              {hrStart != null && hrEnd != null && (
              <tr>
                <td className="py-3 pr-4 font-medium text-gray-900">FC Reposo</td>
                <td className="py-3 pr-4 text-gray-500">{hrStart} bpm</td>
                <td className="py-3 pr-4 font-semibold text-gray-900">{hrEnd} bpm</td>
                <td className="py-3">
                  {hrEnd < hrStart ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-[#16a34a]">Mejorando</span>
                  : hrEnd === hrStart ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Sin cambio</span>
                  : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-[#dc2626]">Empeorando</span>}
                </td>
              </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Récords personales gym ──────────────────────────────────────────── */}
      {gymPRs.length > 0 && (
        <SectionCard title={`Récords Personales Ejercicios — ${gymPRs.length} PRs`}>
          <div className="space-y-2">
            {gymPRs.map(pr => (
              <div key={pr.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{pr.exerciseName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(pr.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {pr.weightKg != null && (
                    <p className="text-base font-black text-[#ea580c]">{pr.weightKg} kg</p>
                  )}
                  {pr.repsCompleted != null && (
                    <p className="text-xs text-gray-500">{pr.repsCompleted} reps</p>
                  )}
                  <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-[#ea580c] mt-0.5">PR</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Historial de actividad ──────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <SectionCard title={`Historial de actividad — últimas ${recentActivity.length} sesiones`}>
          <div className="space-y-2">
            {recentActivity.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-xl shrink-0">{item.type === 'run' ? '🏃' : '💪'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-gray-400">
                      {new Date(item.date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    {item.durationMin != null && (
                      <span className="text-[10px] font-medium text-gray-500 bg-white px-1.5 py-0.5 rounded">{item.durationMin} min</span>
                    )}
                    {item.distanceKm != null && (
                      <span className="text-[10px] font-medium text-gray-500 bg-white px-1.5 py-0.5 rounded">{item.distanceKm} km</span>
                    )}
                  </div>
                </div>
                {item.rpe != null && (
                  <span className="text-xs font-bold text-[#ea580c] shrink-0">RPE {item.rpe}</span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Tests de rendimiento (PerformanceBenchmarks) ───────────────────── */}
      {benchmarks.length > 0 && (() => {
        const grouped: Record<string, BenchmarkPoint[]> = {}
        for (const b of benchmarks) {
          if (!grouped[b.sport]) grouped[b.sport] = []
          grouped[b.sport].push(b)
        }
        return (
          <SectionCard title="Tests de Rendimiento">
            <div className="space-y-4">
              {Object.entries(grouped).map(([sport, items]) => (
                <div key={sport}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    {SPORT_LABELS[sport] ?? sport}
                  </p>
                  <div className="space-y-2">
                    {items.map(b => (
                      <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{METRIC_LABELS[b.metric] ?? b.metric}</p>
                          {b.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{b.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-[#ea580c]">{formatBenchmarkValue(b.value, b.unit)}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(b.testedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )
      })()}
    </div>
  )
}
