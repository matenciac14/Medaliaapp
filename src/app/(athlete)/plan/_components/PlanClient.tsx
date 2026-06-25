'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatWeekRange } from '@/lib/core/date-utils'
import { WEEK_DAYS_SHORT } from '@/lib/constants/sessions'
import type { CalendarWeek } from '@/domain/calendar/calendar.types'

// ── Types ─────────────────────────────────────────────────────────────

export type PlanClientWeekSession = {
  id: string
  dayOfWeek: number
  day: string
  type: string
  label: string
  done: boolean
  durationMin: number
  zoneTarget: string
  detailText: string
  structure: string | null
  intensity: string | null
  logId: string | null
  logDurationMin: number | null
  logRpe: number | null
  logHrAvg: number | null
  logNotes: string | null
}

export type PlanClientWeek = {
  weekNumber: number
  phase: string
  volumeKm: number
  isRecoveryWeek: boolean
  hasTest: boolean
  focusDescription: string
  sessions: PlanClientWeekSession[]
}

export type PlanClientPlan = {
  name: string
  currentWeek: number
  totalWeeks: number
  startDate: string
}

interface PlanClientProps {
  plan: PlanClientPlan
  weeks: PlanClientWeek[]
  nutritionTarget: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } | null
  weightData: { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null } | null
}

// ── Constants ─────────────────────────────────────────────────────────

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃', FARTLEK: '🏃', TIRADA_LARGA: '🏃', TEMPO: '🏃',
  INTERVALOS: '⚡', SIMULACRO: '🏁', TEST: '📊',
  CICLA: '🚴', NATACION: '🏊', FUERZA: '💪', DESCANSO: '😴', OTRO: '🏅',
}

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2', FARTLEK: 'Fartlek', TIRADA_LARGA: 'Tirada Larga',
  TEMPO: 'Tempo', INTERVALOS: 'Intervalos', SIMULACRO: 'Simulacro', TEST: 'Test',
  CICLA: 'Cicla', NATACION: 'Natación', FUERZA: 'Fuerza', DESCANSO: 'Descanso', OTRO: 'Entrenamiento',
}

const PLAN_NAME_MAP: Record<string, string> = {
  // GoalType values (generator.ts format)
  RACE_HALF_MARATHON: 'Media Maratón', RACE_MARATHON: 'Maratón',
  RACE_10K: '10K', RACE_5K: '5K',
  BODY_RECOMPOSITION: 'Recomposición Corporal',
  WEIGHT_LOSS: 'Pérdida de Peso', GENERAL_FITNESS: 'Fitness General',
  // Template name aliases
  HALF_MARATHON_18W: 'Media Maratón', TEN_K_12W: '10K',
  FIVE_K_8W: '5K', BODY_RECOMPOSITION_16W: 'Recomposición Corporal',
}

const INTENSITY_BADGE: Record<string, { bg: string; label: string }> = {
  HIGH:     { bg: 'bg-orange-50 text-orange-600 border-orange-100', label: '🔥 ALTA intensidad' },
  MODERATE: { bg: 'bg-amber-50 text-amber-600 border-amber-100',    label: '💪 MODERADA'        },
  LOW:      { bg: 'bg-green-50 text-green-700 border-green-100',    label: '🌿 BAJA intensidad' },
  REST:     { bg: 'bg-gray-100 text-gray-500 border-gray-200',      label: '😴 Descanso'        },
}

const ZONE_COLORS: Record<string, string> = {
  Z1: '#22c55e', Z2: '#3b82f6', Z3: '#eab308', Z4: '#f97316', Z5: '#ef4444',
}

const PHASES_ORDER = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']
const PHASE_DISPLAY: Record<string, string> = {
  BASE: 'BASE', DESARROLLO: 'DESARRO', ESPECIFICO: 'ESPECÍF.', AFINAMIENTO: 'AFIN.',
}
const PHASE_DISPLAY_GYM: Record<string, string> = {
  BASE: 'ADAPT.', DESARROLLO: 'VOLUMEN', ESPECIFICO: 'INTENS.', AFINAMIENTO: 'PICO',
}

// ── Helpers ───────────────────────────────────────────────────────────

function getIntensityKey(type: string, intensityField: string | null): string {
  if (intensityField) return intensityField
  // Fallback mirrors generator.ts getSessionIntensity()
  if (['INTERVALOS', 'TIRADA_LARGA', 'SIMULACRO', 'TEST'].includes(type)) return 'HIGH'
  if (['TEMPO', 'FARTLEK', 'CICLA', 'NATACION', 'FUERZA', 'OTRO'].includes(type)) return 'MODERATE'
  if (type === 'RODAJE_Z2') return 'LOW'
  if (type === 'DESCANSO') return 'REST'
  return 'MODERATE'
}

function getWeekMonday(currentWeekNum: number, activeWeekNum: number): Date {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - (todayDow - 1))
  thisMonday.setHours(0, 0, 0, 0)
  const monday = new Date(thisMonday)
  monday.setDate(thisMonday.getDate() + (activeWeekNum - currentWeekNum) * 7)
  return monday
}

function formatVolume(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m}`
}

function formatPlanName(name: string): string {
  // Strip date suffix ("Plan X — 11/6/2026" → "Plan X") then strip "Plan " prefix
  const base = name.split(' — ')[0].split(' - ')[0].replace(/^Plan\s+/i, '').trim()
  return PLAN_NAME_MAP[base] ?? base
}

// Parse a detailText line — supports new format "zone|durationMin|text" and old plain-text format
function parseStructureBlock(line: string): { zone: string | null; color: string; durationMin: number | null; text: string } {
  const parts = line.split('|')
  if (parts.length === 3) {
    const zone = parts[0].trim().toUpperCase()
    const durationMin = parseInt(parts[1].trim(), 10) || null
    const text = parts[2].trim()
    return { zone, color: ZONE_COLORS[zone] ?? '#9ca3af', durationMin, text }
  }
  // Old plain-text format fallback
  const match = line.match(/\b(Z[1-5])\b/i)
  if (!match) return { zone: null, color: '#d1d5db', durationMin: null, text: line }
  const zone = match[1].toUpperCase()
  return { zone, color: ZONE_COLORS[zone] ?? '#9ca3af', durationMin: null, text: line }
}

// ── EditModal ─────────────────────────────────────────────────────────

const SESSION_TYPE_OPTIONS = [
  { value: 'RODAJE_Z2',    label: 'Rodaje Z2' },
  { value: 'FARTLEK',      label: 'Fartlek' },
  { value: 'TEMPO',        label: 'Tempo' },
  { value: 'INTERVALOS',   label: 'Intervalos' },
  { value: 'TIRADA_LARGA', label: 'Tirada Larga' },
  { value: 'FUERZA',       label: 'Fuerza' },
  { value: 'CICLA',        label: 'Cicla' },
  { value: 'NATACION',     label: 'Natación' },
  { value: 'SIMULACRO',    label: 'Simulacro' },
  { value: 'DESCANSO',     label: 'Descanso' },
  { value: 'OTRO',         label: 'Otro' },
]

function EditModal({ session, onClose, onSaved }: {
  session: PlanClientWeekSession
  onClose: () => void
  onSaved: (updates: Partial<PlanClientWeekSession>) => void
}) {
  const isLogged = !!session.logId

  // Planned session fields
  const [type, setType]             = useState(session.type)
  const [durationMin, setDuration]  = useState(String(session.durationMin))
  const [zoneTarget, setZone]       = useState(session.zoneTarget)
  const [detailText, setDetail]     = useState(session.detailText)

  // Log fields
  const [logDuration, setLogDuration] = useState(String(session.logDurationMin ?? ''))
  const [rpe, setRpe]                 = useState(session.logRpe ?? 0)
  const [hrAvg, setHrAvg]             = useState(String(session.logHrAvg ?? ''))
  const [logNotes, setLogNotes]       = useState(session.logNotes ?? '')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const sessionUpdates: Record<string, unknown> = {}
      if (type !== session.type) sessionUpdates.type = type
      if (parseInt(durationMin) !== session.durationMin) sessionUpdates.durationMin = parseInt(durationMin)
      if (zoneTarget !== session.zoneTarget) sessionUpdates.zoneTarget = zoneTarget
      if (detailText !== session.detailText) sessionUpdates.detailText = detailText

      const logUpdates: Record<string, unknown> = {}
      if (isLogged) {
        const ld = logDuration ? parseInt(logDuration) : null
        if (ld !== session.logDurationMin) logUpdates.durationMin = ld
        const r = rpe > 0 ? rpe : null
        if (r !== session.logRpe) logUpdates.rpe = r
        const hr = hrAvg ? parseInt(hrAvg) : null
        if (hr !== session.logHrAvg) logUpdates.hrAvg = hr
        if (logNotes.trim() !== (session.logNotes ?? '')) logUpdates.notes = logNotes.trim() || null
      }

      const [sessionRes, logRes] = await Promise.all([
        Object.keys(sessionUpdates).length > 0
          ? fetch(`/api/athlete/sessions/${session.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sessionUpdates),
            })
          : Promise.resolve(null),
        isLogged && Object.keys(logUpdates).length > 0
          ? fetch(`/api/log/session/${session.logId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(logUpdates),
            })
          : Promise.resolve(null),
      ])

      if (sessionRes && !sessionRes.ok) { setError('Error al guardar sesión.'); return }
      if (logRes && !logRes.ok) { setError('Error al guardar registro.'); return }

      // Build merged updates for optimistic state
      const merged: Partial<PlanClientWeekSession> = {
        ...sessionUpdates as Partial<PlanClientWeekSession>,
        ...(isLogged ? {
          logDurationMin: logUpdates.durationMin as number ?? session.logDurationMin,
          logRpe:         logUpdates.rpe         as number ?? session.logRpe,
          logHrAvg:       logUpdates.hrAvg        as number ?? session.logHrAvg,
          logNotes:       logUpdates.notes        as string ?? session.logNotes,
        } : {}),
      }
      onSaved(merged)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{SESSION_ICONS[session.type] ?? '🏅'}</span>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Editar sesión</p>
              <p className="font-black text-gray-900">{SESSION_LABELS[session.type] ?? session.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none pb-0.5">×</button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Sesión planificada ── */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sesión planificada</p>

            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Tipo de sesión</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f] bg-white"
              >
                {SESSION_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Duración + Zona */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Duración (min)</label>
                <input
                  type="number"
                  value={durationMin}
                  onChange={e => setDuration(e.target.value)}
                  min={1}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Zona objetivo</label>
                <input
                  type="text"
                  value={zoneTarget}
                  onChange={e => setZone(e.target.value)}
                  placeholder="Z2, Z3-Z4…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Descripción / estructura</label>
              <textarea
                value={detailText}
                onChange={e => setDetail(e.target.value)}
                rows={3}
                placeholder="Describe la sesión…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          {/* ── Registro ── */}
          {isLogged && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registro de sesión</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Duración real (min)</label>
                  <input
                    type="number"
                    value={logDuration}
                    onChange={e => setLogDuration(e.target.value)}
                    placeholder={String(session.durationMin)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">FC media (bpm)</label>
                  <input
                    type="number"
                    value={hrAvg}
                    onChange={e => setHrAvg(e.target.value)}
                    placeholder="148"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              {/* RPE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-600">RPE — Esfuerzo percibido</p>
                  <span className="text-base font-black text-[#f97316]">{rpe > 0 ? rpe : '–'}</span>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRpe(rpe === n ? 0 : n)}
                      className={cn(
                        'flex-1 h-8 rounded-lg text-[11px] font-bold border transition-colors',
                        rpe === n
                          ? 'bg-[#f97316] border-[#f97316] text-white'
                          : n < rpe
                          ? 'bg-orange-50 border-[#f97316] text-[#f97316]'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      )}
                    >{n}</button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Notas</label>
                <textarea
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  rows={2}
                  placeholder="Cómo te sentiste, condiciones…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:opacity-90 text-white font-bold py-3.5 rounded-xl text-sm transition-opacity disabled:opacity-60"
          >
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CalendarStrip ─────────────────────────────────────────────────────

function CalendarStrip({ week, calendarDays, weekMonday, selectedDow, todayDow, isCurrentWeek, onSelect, completedCount, totalTraining, loggedIds }: {
  week: PlanClientWeek | null
  calendarDays: CalendarWeek['days'] | null
  weekMonday: Date
  selectedDow: number
  todayDow: number
  isCurrentWeek: boolean
  onSelect: (dow: number) => void
  completedCount: number
  totalTraining: number
  loggedIds: Set<string>
}) {
  const [todayActive, setTodayActive] = useState(false)
  const pct = totalTraining > 0 ? (completedCount / totalTraining) * 100 : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-7 divide-x divide-gray-50">
        {Array.from({ length: 7 }, (_, i) => {
          const dow = i + 1
          const session = week?.sessions.find(s => s.dayOfWeek === dow) ?? null
          const calDay = calendarDays?.find(d => d.dow === dow) ?? null
          const gymLabel = calDay?.gym?.label ?? null
          const gymDone = calDay?.gym?.done ?? false
          const dateObj = new Date(weekMonday.getTime() + i * 86400000)
          const isToday = isCurrentWeek && dow === todayDow
          const isSelected = dow === selectedDow
          const isRest = !session || session.type === 'DESCANSO'
          const isDone = (session?.done || (session ? loggedIds.has(session.id) : false)) ?? false

          const cardBg = isToday && isSelected && todayActive
            ? 'bg-[#ea580c] active:bg-[#d4520b]'
            : isToday && isSelected
            ? 'bg-[#f97316] active:bg-[#ea580c]'
            : isToday
            ? 'bg-orange-50 ring-1 ring-inset ring-[#f97316]/30 active:bg-[#f97316]'
            : isSelected ? 'bg-[#1e3a5f] hover:bg-[#243f6a] active:bg-[#243f6a]'
            : isDone ? 'bg-green-50/60 hover:bg-gray-100 active:bg-gray-100'
            : 'bg-white hover:bg-gray-100 active:bg-gray-100'

          return (
            <button
              key={dow}
              onClick={() => { if (isToday) setTodayActive(true); else setTodayActive(false); onSelect(dow) }}
              className={cn('flex flex-col items-center py-4 px-1 transition-colors text-center relative group', cardBg)}
            >
              {isToday && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#f97316] rounded-b" />
              )}
              <span className={cn('text-xs font-semibold mb-1',
                isToday && isSelected ? 'text-white font-bold' :
                isToday ? 'text-[#f97316] font-bold group-active:text-white' :
                isSelected ? 'text-blue-200' :
                'text-gray-400'
              )}>
                {WEEK_DAYS_SHORT[i]}
              </span>

              <div className="flex items-center gap-1 mb-2">
                <span className={cn('text-xl font-black leading-none',
                  isToday && isSelected ? 'text-white' :
                  isToday ? 'text-[#f97316] group-active:text-white' :
                  isSelected ? 'text-white' :
                  isRest ? 'text-gray-300' :
                  isDone ? 'text-green-600' :
                  'text-gray-800'
                )}>
                  {dateObj.getDate()}
                </span>
                {isToday && (
                  <span className="text-[9px] font-bold bg-[#f97316] text-white px-1.5 py-0.5 rounded-full leading-none">
                    HOY
                  </span>
                )}
              </div>

              <span className="text-base mb-1.5">
                {isDone && !isRest
                  ? <CheckCircle2 size={18} className="text-green-500 mx-auto" />
                  : SESSION_ICONS[session?.type ?? ''] ?? (isRest ? '😴' : (gymLabel ? null : '📅'))}
              </span>

              <span className={cn('text-xs font-semibold leading-tight px-0.5',
                isToday && isSelected ? 'text-white' :
                isToday ? 'text-gray-700 group-active:text-white' :
                isSelected ? 'text-white' :
                isRest ? 'text-gray-400' : 'text-gray-700'
              )}>
                {!session ? (gymLabel ? null : '—') : isRest ? 'Descanso' : (SESSION_LABELS[session.type] ?? session.type)}
              </span>

              {!isRest && session && (
                <span className={cn('text-[10px] mt-0.5',
                  isToday && isSelected ? 'text-white/80' :
                  isToday ? 'text-gray-400 group-active:text-white/80' :
                  isSelected ? 'text-blue-200' : 'text-gray-400'
                )}>
                  {session.durationMin} min
                  {session.zoneTarget && session.zoneTarget !== '—' && session.zoneTarget !== 'N/A' ? ` · ${session.zoneTarget}` : ''}
                </span>
              )}
              {gymLabel && (
                <span className={cn('text-[8px] font-bold rounded-full px-1 py-0.5 leading-none mt-0.5',
                  gymDone ? 'bg-green-600 text-white' :
                  isSelected ? 'bg-purple-700 text-white' : 'text-purple-600 bg-purple-50'
                )}>
                  {gymDone ? '✓' : '💪'}{isRest ? ` ${gymLabel}` : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── LogModal ──────────────────────────────────────────────────────────

function LogModal({ session, onClose, onSuccess }: {
  session: PlanClientWeekSession
  onClose: () => void
  onSuccess: () => void
}) {
  const [completed, setCompleted] = useState<boolean | null>(null)
  const [actualDuration, setActualDuration] = useState(String(session.durationMin))
  const [rpe, setRpe] = useState(0)
  const [hrAvg, setHrAvg] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (completed === null) { setError('¿Completaste la sesión?'); return }
    // "No la hice" — acknowledge without creating a log entry
    if (!completed) { onSuccess(); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/log/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedSessionId: session.id,
          completed: true,
          durationMin: actualDuration ? parseInt(actualDuration) : undefined,
          rpe: rpe > 0 ? rpe : undefined,
          hrAvg: hrAvg ? parseInt(hrAvg) : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) { setError('No se pudo guardar. Intenta de nuevo.'); return }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{SESSION_ICONS[session.type] ?? '🏅'}</span>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Registrar sesión</p>
              <p className="font-black text-gray-900">{session.durationMin} min · {SESSION_LABELS[session.type] ?? session.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none pb-0.5">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* ¿Completaste? */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">¿Completaste la sesión?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCompleted(true)}
                className={cn('flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors',
                  completed === true
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-200 text-gray-700 hover:border-green-300'
                )}
              >✓ Sí, la hice</button>
              <button
                onClick={() => setCompleted(false)}
                className={cn('flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors',
                  completed === false
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-gray-200 text-gray-700 hover:border-red-300'
                )}
              >✗ No la hice</button>
            </div>
          </div>

          {completed && (
            <>
              {/* Datos reales */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Duración real (min)</label>
                  <input
                    type="number"
                    value={actualDuration}
                    onChange={e => setActualDuration(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">FC media (bpm)</label>
                  <input
                    type="number"
                    value={hrAvg}
                    onChange={e => setHrAvg(e.target.value)}
                    placeholder="148"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              {/* RPE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">RPE — Esfuerzo percibido</p>
                  <span className="text-lg font-black text-[#f97316]">{rpe > 0 ? rpe : '–'}</span>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      onClick={() => setRpe(n)}
                      className={cn(
                        'flex-1 h-9 rounded-lg text-[11px] font-bold border transition-colors',
                        rpe === n
                          ? 'bg-[#f97316] border-[#f97316] text-white'
                          : n < rpe
                          ? 'bg-orange-50 border-[#f97316] text-[#f97316]'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Muy fácil</span><span>Máximo</span>
                </div>
              </div>
            </>
          )}

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Cómo te sentiste, condiciones, ajustes..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#f97316] hover:opacity-90 text-white font-bold py-3.5 rounded-xl text-sm transition-opacity disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Guardar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SessionDetailCard ─────────────────────────────────────────────────

function SessionDetailCard({ session, isToday, isLogged, onLogged, onEdited }: {
  session: PlanClientWeekSession
  isToday: boolean
  isLogged: boolean
  onLogged: () => void
  onEdited: (updates: Partial<PlanClientWeekSession>) => void
}) {
  const router = useRouter()
  const [logDone, setLogDone] = useState(session.done || isLogged)
  const [showModal, setShowModal] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // Sync if parent's optimistic state arrives after mount (e.g. navigating back to a logged day)
  if (!logDone && isLogged) setLogDone(true)

  if (session.type === 'DESCANSO') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center gap-4">
        <span className="text-4xl">😴</span>
        <div>
          <p className="text-lg font-bold text-gray-700">Día de descanso</p>
          <p className="text-sm text-gray-400 mt-0.5">Aprovecha para recuperar bien hoy</p>
        </div>
      </div>
    )
  }

  const intensityKey = getIntensityKey(session.type, session.intensity)
  const badge = INTENSITY_BADGE[intensityKey] ?? INTENSITY_BADGE.MODERATE
  const isGym = session.type === 'FUERZA'
  const accentColor = isToday
    ? 'bg-[#f97316]'
    : logDone ? 'bg-green-400'
    : isGym ? 'bg-purple-500'
    : 'bg-[#1e3a5f]'
  const showZone = session.zoneTarget && session.zoneTarget !== '—' && session.zoneTarget !== '' && session.zoneTarget !== 'N/A'
  const structureLines = (session.structure || session.detailText)
    ? (session.structure ?? session.detailText!).split('\n').filter(Boolean)
    : []

  return (
    <>
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex">
        <div className={cn('w-1.5 shrink-0', accentColor)} />
        <div className="flex-1 p-6 space-y-4">

          {/* Title */}
          <div className="flex items-start gap-3">
            <span className="text-3xl">{SESSION_ICONS[session.type] ?? '🏅'}</span>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-gray-900 leading-tight">
                {SESSION_LABELS[session.type] ?? session.type}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                {isToday && (
                  <span className="text-[10px] font-bold bg-[#f97316] text-white px-2 py-0.5 rounded-full">
                    HOY
                  </span>
                )}
                {logDone && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                    <CheckCircle2 size={11} /> Completada
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
              {session.durationMin} min
            </span>
            {showZone && !isGym && (
              <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100">
                Zona {session.zoneTarget}
              </span>
            )}
            <span className={cn('text-sm font-semibold px-3 py-1.5 rounded-full border', badge.bg)}>
              {badge.label}
            </span>
          </div>

          {/* Structure / Exercises */}
          {structureLines.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {isGym ? 'Ejercicios' : 'Estructura'}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {structureLines.map((line, idx) => {
                  const { zone, color, durationMin, text } = parseStructureBlock(line)
                  return (
                    <div key={idx} className="flex items-start gap-2.5">
                      {/* Zone dot + label */}
                      <div className="flex items-center gap-1 shrink-0 pt-1">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-bold w-5 leading-none" style={{ color }}>
                          {zone ?? ''}
                        </span>
                      </div>
                      {/* Duration */}
                      {durationMin != null && (
                        <span className="text-sm font-bold text-gray-800 shrink-0 w-12 pt-px">
                          {durationMin} min
                        </span>
                      )}
                      {/* Description */}
                      <p className="text-sm text-gray-600 leading-relaxed flex-1">{text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
            {logDone ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="text-sm font-semibold text-green-700">Completada</span>
                </div>
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Editar ✏️
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#f97316] hover:opacity-90 text-white text-sm font-bold px-5 py-3 rounded-xl transition-opacity"
                >
                  Registrar sesión →
                </button>
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-4 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Editar ✏️
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {showModal && (
      <LogModal
        session={session}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false)
          setLogDone(true)
          onLogged()
          router.refresh()
        }}
      />
    )}
    {showEdit && (
      <EditModal
        session={session}
        onClose={() => setShowEdit(false)}
        onSaved={(updates) => {
          setShowEdit(false)
          onEdited(updates)
        }}
      />
    )}
    </>
  )
}

// ── NutritionCard ─────────────────────────────────────────────────────

function NutritionCard({ nt }: { nt: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } }) {
  const macros = [
    { label: 'Proteína', value: nt.proteinG, colorVal: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Carbos',   value: nt.carbsG,   colorVal: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Grasas',   value: nt.fatG,     colorVal: 'text-green-600',  bg: 'bg-green-50'  },
  ]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Plan nutricional del día
        </span>
      </div>
      <div className="flex items-end gap-5">
        <div className="shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-[#f97316] leading-none">
              {nt.kcal.toLocaleString('es')}
            </span>
            <span className="text-sm font-medium text-gray-400">kcal</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{nt.label}</p>
        </div>
        <div className="flex gap-3 flex-1">
          {macros.map(m => (
            <div key={m.label} className={cn('flex-1 rounded-xl px-3 py-2.5 text-center', m.bg)}>
              <p className="text-[10px] text-gray-500 mb-1">{m.label}</p>
              <p className={cn('text-lg font-black', m.colorVal)}>{m.value} g</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── KPICards ──────────────────────────────────────────────────────────

function KPICards({ completed, total, volumeLabel, adherencePct, isGym }: {
  completed: number; total: number; volumeLabel: string; adherencePct: number; isGym: boolean
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Completadas',               value: `${completed} / ${total}`, sub: 'sesiones',    accent: false },
        { label: isGym ? 'Vol. entren.' : 'Volumen', value: volumeLabel,        sub: 'esta semana', accent: false },
        { label: 'Adherencia',                value: `${adherencePct}%`,        sub: 'meta: 80%',  accent: true  },
      ].map((kpi, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">{kpi.label}</p>
          <p className={cn('text-2xl font-black leading-none',
            kpi.accent ? 'text-[#f97316]' : 'text-gray-900'
          )}>
            {kpi.value}
          </p>
          <p className="text-[10px] text-gray-400 mt-1.5">{kpi.sub}</p>
        </div>
      ))}
    </div>
  )
}

// ── PhaseBar ──────────────────────────────────────────────────────────

function PhaseBar({ allPhases, currentPhase, currentWeekNum, totalWeeks, weeks, isGymPlan }: {
  allPhases: string[]; currentPhase: string; currentWeekNum: number; totalWeeks: number; weeks: PlanClientWeek[]; isGymPlan?: boolean
}) {
  const display = PHASES_ORDER.filter(p => allPhases.includes(p))
  if (display.length === 0) return null
  const pct = Math.round((currentWeekNum / totalWeeks) * 100)

  // Week count per phase for proportional pill widths
  const phaseCounts = display.map(phase => ({
    phase,
    count: weeks.filter(w => w.phase === phase).length || 1,
  }))

  // Determine index of active phase to classify past vs future
  const activeIdx = display.indexOf(currentPhase)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-900">Progreso del plan</span>
        <span className="text-xs text-gray-400">Sem. {currentWeekNum}/{totalWeeks} · {pct}%</span>
      </div>
      <div className="flex gap-1.5">
        {phaseCounts.map(({ phase, count }, idx) => {
          const isActive = idx === activeIdx
          const isDone   = idx < activeIdx
          return (
            <div
              key={phase}
              style={{ flex: count }}
              className={cn(
                'rounded-lg py-2 text-center transition-all min-w-0',
                isActive ? 'bg-[#1e3a5f] text-white' :
                isDone   ? 'bg-green-100 text-green-700' :
                           'bg-gray-100 text-gray-400'
              )}
            >
              <span className="text-[10px] font-bold truncate block px-1">
                {isDone ? '✓ ' : ''}{(isGymPlan ? PHASE_DISPLAY_GYM : PHASE_DISPLAY)[phase] ?? phase}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AdherenceChart ────────────────────────────────────────────────────

function AdherenceChart({ weeks, currentWeekNum, totalWeeks, todayDow, loggedIds }: {
  weeks: PlanClientWeek[]; currentWeekNum: number; totalWeeks: number; todayDow: number; loggedIds: Set<string>
}) {
  // Always show 5 slots: up to 2 before current + current + up to 2 after
  const startWeek = Math.max(1, Math.min(currentWeekNum - 2, totalWeeks - 4))
  const slots = Array.from({ length: 5 }, (_, i) => {
    const weekNum = startWeek + i
    if (weekNum > totalWeeks) return null
    const weekData = weeks.find(w => w.weekNumber === weekNum)
    const isFuture  = weekNum > currentWeekNum
    const isCurrent = weekNum === currentWeekNum
    if (!weekData || isFuture) return { weekNum, pct: 0, isCurrent, isFuture: true }
    // For the current week only count sessions up to today — future days of the week don't penalize
    const sessions = isCurrent
      ? weekData.sessions.filter(s => s.dayOfWeek <= todayDow)
      : weekData.sessions
    const t = sessions.filter(s => s.type !== 'DESCANSO').length
    const c = sessions.filter(s => (s.done || (isCurrent && loggedIds.has(s.id))) && s.type !== 'DESCANSO').length
    return { weekNum, pct: t > 0 ? (c / t) * 100 : 0, isCurrent, isFuture: false }
  }).filter(Boolean) as { weekNum: number; pct: number; isCurrent: boolean; isFuture: boolean }[]

  if (slots.length === 0) return null

  const pastSlots = slots.filter(s => !s.isFuture)
  const avgPct = pastSlots.length > 0
    ? Math.round(pastSlots.reduce((sum, s) => sum + s.pct, 0) / pastSlots.length)
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-900">Adherencia semanal</span>
        <span className="text-xs text-gray-400">Promedio {avgPct}%</span>
      </div>
      <div className="flex items-end gap-2 h-14">
        {slots.map(({ weekNum, pct, isCurrent, isFuture }) => (
          <div key={weekNum} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-md transition-all duration-500"
              style={{
                height: isFuture ? '4px' : pct === 0 ? '3px' : `${Math.max(8, pct * 0.52)}px`,
                backgroundColor: isFuture ? '#e5e7eb' : pct === 0 ? '#d1d5db' : isCurrent ? '#f97316' : '#3b82f6',
              }}
            />
            <span className="text-[9px] text-gray-400">S{weekNum}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── BodyCompositionCard ───────────────────────────────────────────────

function BodyCompositionCard({ weightData }: {
  weightData: { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null } | null
}) {
  if (!weightData?.currentKg) return null
  const { currentKg, goalKg, progressPct, weeklyChange } = weightData
  const delta = goalKg ? Math.round((currentKg - goalKg) * 10) / 10 : null
  const isOnTrack = delta !== null && delta < 0 && weeklyChange !== null && weeklyChange < 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-900">Composición corporal</span>
        {isOnTrack && (
          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            ↓ {Math.abs(weeklyChange!)} kg/sem · ritmo ideal
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-black text-gray-900">{currentKg} kg</span>
        {goalKg && <span className="text-sm text-gray-400">→ meta {goalKg} kg</span>}
      </div>

      {goalKg && (
        <p className="text-[10px] text-gray-400 mt-1">
          🎯 Meta: {goalKg} kg
          {delta !== null && (
            <span className="text-gray-500 ml-1">· {delta > 0 ? '+' : ''}{delta} kg restantes</span>
          )}
          {weeklyChange !== null && weeklyChange < 0 && (
            <span className="text-green-600 ml-1 font-medium">· ✓ vas bien</span>
          )}
        </p>
      )}
    </div>
  )
}

// ── PlanClient ────────────────────────────────────────────────────────

export default function PlanClient({ plan, weeks, nutritionTarget, weightData }: PlanClientProps) {
  const todayDow = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  }, [])

  const [selectedWeekNum, setSelectedWeekNum] = useState(plan.currentWeek)
  const [selectedDow, setSelectedDow] = useState(todayDow)
  // Optimistic logged state — persists across day/week navigation within this session
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set())
  function markLogged(sessionId: string) {
    setLoggedIds(prev => new Set(prev).add(sessionId))
  }

  // Optimistic edit overrides — persists changes across navigation without server round-trip
  const [editedSessions, setEditedSessions] = useState<Map<string, Partial<PlanClientWeekSession>>>(new Map())
  function applyEdit(sessionId: string, updates: Partial<PlanClientWeekSession>) {
    setEditedSessions(prev => {
      const next = new Map(prev)
      next.set(sessionId, { ...(next.get(sessionId) ?? {}), ...updates })
      return next
    })
  }

  // Merge server data with optimistic edits
  function mergeSession(s: PlanClientWeekSession): PlanClientWeekSession {
    const overrides = editedSessions.get(s.id)
    return overrides ? { ...s, ...overrides } : s
  }

  const isCurrentWeek = selectedWeekNum === plan.currentWeek
  const week = weeks.find(w => w.weekNumber === selectedWeekNum) ?? null
  const allPhases = [...new Set(weeks.map(w => w.phase))]

  // Calendar API — fetch unified week data (sport + gym) for any week offset
  const weekOffset = selectedWeekNum - plan.currentWeek
  const [calWeek, setCalWeek] = useState<CalendarWeek | null>(null)
  useEffect(() => {
    fetch(`/api/athlete/calendar?weekOffset=${weekOffset}`)
      .then(r => r.json())
      .then(setCalWeek)
      .catch(() => {})
  }, [weekOffset])

  const weekMonday = useMemo(
    () => getWeekMonday(plan.currentWeek, selectedWeekNum),
    [plan.currentWeek, selectedWeekNum]
  )

  const selDateObj = new Date(weekMonday.getTime() + (selectedDow - 1) * 86400000)
  const selDayLabel = `${WEEK_DAYS_SHORT[selectedDow - 1]} ${selDateObj.getDate()}`
  const weekLabel = `Semana ${selectedWeekNum} · ${formatWeekRange(weekMonday)}`

  const selectedSession = useMemo(() => {
    const s = week?.sessions.find(s => s.dayOfWeek === selectedDow) ?? null
    return s ? mergeSession(s) : null
  }, [week, selectedDow, editedSessions])

  // KPI — combina done del servidor + loggedIds optimista
  const completedCount = week?.sessions.filter(s => (s.done || loggedIds.has(s.id)) && s.type !== 'DESCANSO').length ?? 0
  const totalTraining  = week?.sessions.filter(s => s.type !== 'DESCANSO').length ?? 0
  const adherencePct   = totalTraining > 0 ? Math.round((completedCount / totalTraining) * 100) : 0

  // Volume & gym detection
  const isGym = plan.name.toLowerCase().includes('recomp')
    || plan.name.toLowerCase().includes('body')
    || plan.name.toLowerCase().includes('fuerza')
    || ((week?.sessions.filter(s => s.type === 'FUERZA').length ?? 0) >
        (week?.sessions.filter(s => s.type !== 'FUERZA' && s.type !== 'DESCANSO').length ?? 0))

  const volumeLabel = isGym
    ? formatVolume(week?.sessions.filter(s => (s.done || loggedIds.has(s.id)) && s.type !== 'DESCANSO').reduce((sum, s) => sum + s.durationMin, 0) ?? 0)
    : `${week?.volumeKm ?? 0} km`

  const realCurrentPhase = weeks.find(w => w.weekNumber === plan.currentWeek)?.phase ?? (week?.phase ?? 'BASE')

  return (
    <div className="px-4 py-6 md:px-8 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
            Mi Plan de Entrenamiento
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Plan {formatPlanName(plan.name)} · {plan.totalWeeks} semanas</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => { setSelectedWeekNum(w => Math.max(1, w - 1)); setSelectedDow(todayDow) }}
              disabled={selectedWeekNum <= 1}
              className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <span className="px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">
              {weekLabel}
            </span>
            <button
              onClick={() => { setSelectedWeekNum(w => w + 1); setSelectedDow(1) }}
              disabled={selectedWeekNum >= plan.totalWeeks}
              className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>

          <div className="hidden md:flex items-center bg-[#1e3a5f] text-white px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap">
            {realCurrentPhase} · Semana {plan.currentWeek}/{plan.totalWeeks}
          </div>
        </div>
      </div>

      {/* ── Calendar Strip ── */}
      <CalendarStrip
        week={week}
        calendarDays={calWeek?.days ?? null}
        weekMonday={weekMonday}
        selectedDow={selectedDow}
        todayDow={todayDow}
        isCurrentWeek={isCurrentWeek}
        onSelect={setSelectedDow}
        completedCount={completedCount}
        totalTraining={totalTraining}
        loggedIds={loggedIds}
      />

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Left (3/5) */}
        <div className="lg:col-span-3 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Sesión seleccionada — {selDayLabel}
          </p>

          {selectedSession ? (
            <SessionDetailCard
              key={selectedSession.id}
              session={selectedSession}
              isToday={isCurrentWeek && selectedDow === todayDow}
              isLogged={loggedIds.has(selectedSession.id)}
              onLogged={() => markLogged(selectedSession.id)}
              onEdited={(updates) => { applyEdit(selectedSession.id, updates) }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center gap-4">
              <span className="text-4xl">😴</span>
              <div>
                <p className="text-lg font-bold text-gray-700">Día de descanso</p>
                <p className="text-sm text-gray-400 mt-0.5">Aprovecha para recuperar bien hoy</p>
              </div>
            </div>
          )}

          {nutritionTarget && <NutritionCard nt={nutritionTarget} />}
        </div>

        {/* Right (2/5) */}
        <div className="lg:col-span-2 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Semana en números
          </p>

          <KPICards
            completed={completedCount}
            total={totalTraining}
            volumeLabel={volumeLabel}
            adherencePct={adherencePct}
            isGym={isGym}
          />

          <PhaseBar
            allPhases={allPhases}
            currentPhase={realCurrentPhase}
            currentWeekNum={plan.currentWeek}
            totalWeeks={plan.totalWeeks}
            weeks={weeks}
            isGymPlan={isGym}
          />

          <AdherenceChart
            weeks={weeks}
            currentWeekNum={plan.currentWeek}
            totalWeeks={plan.totalWeeks}
            todayDow={todayDow}
            loggedIds={loggedIds}
          />

          <BodyCompositionCard weightData={weightData} />
        </div>
      </div>
    </div>
  )
}
