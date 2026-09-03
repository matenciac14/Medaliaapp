'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatWeekRange } from '@/lib/core/date-utils'
import { WEEK_DAYS_SHORT, SESSION_NAMES } from '@/lib/constants/sessions'
import type { CalendarWeek } from '@/domain/calendar/calendar.types'
import type { WeekDayCell } from '../../_components/week-day-cells'
import WeekDayStrip from '../../_components/WeekDayStrip'
import PageTopBar from '../../_components/PageTopBar'
import WeekNavBar from '../../_components/WeekNavBar'
import SessionDetailCard from './SessionDetailCard'

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
  logDistanceKm: number | null
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
  checkInData?: { energyLevel: number | null; sleepHours: number | null; stressLevel: number | null; motivationLevel: number | null; recordedAt: string } | null
  bodyMeasures?: { waistCm: number | null; hipsCm: number | null; armsCm: number | null; thighsCm: number | null } | null
  hrZones?: { z1: { min: number; max: number }; z2: { min: number; max: number }; z3: { min: number; max: number }; z4: { min: number; max: number }; z5: { min: number; max: number } } | null
}

// ── Helpers ───────────────────────────────────────────────────────────

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
  STRENGTH_TRAINING: 'Entrenamiento de Fuerza',
  WEIGHT_LOSS: 'Pérdida de Peso', GENERAL_FITNESS: 'Fitness General',
  // Template name aliases
  HALF_MARATHON_18W: 'Media Maratón', TEN_K_12W: '10K',
  FIVE_K_8W: '5K', BODY_RECOMPOSITION_16W: 'Recomposición Corporal',
}

const PHASES_ORDER = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']

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

// ── CalendarStrip ─────────────────────────────────────────────────────

function CalendarStrip({ week, calendarDays, weekMonday, selectedDow, todayDow, isCurrentWeek, onSelect, loggedIds }: {
  week: PlanClientWeek | null
  calendarDays: CalendarWeek['days'] | null
  weekMonday: Date
  selectedDow: number
  todayDow: number
  isCurrentWeek: boolean
  onSelect: (dow: number) => void
  loggedIds: Set<string>
}) {
  // Pre-compute day data for both mobile and desktop views
  const dayData = Array.from({ length: 7 }, (_, i) => {
    const dow = i + 1
    const session = week?.sessions.find(s => s.dayOfWeek === dow) ?? null
    const calDay = calendarDays?.find(d => d.dow === dow) ?? null
    const gymLabel = calDay?.gym?.label ?? null
    const dateObj = new Date(weekMonday.getTime() + i * 86400000)
    const isToday = isCurrentWeek && dow === todayDow
    const isSelected = dow === selectedDow
    const isRest = !session || session.type === 'DESCANSO'
    const isDone = (session?.done || (session ? loggedIds.has(session.id) : false)) ?? false
    const hasSession = !!session && !isRest
    return { i, dow, session, gymLabel, dateObj, isToday, isSelected, isRest, isDone, hasSession }
  })

  return (
    <div>
      {/* Mobile: day pills — no card wrapper, full width */}
      <div className="sm:hidden flex justify-between">
        {dayData.map(({ i, dow, isToday, isSelected, isDone, isRest, hasSession, dateObj }) => (
          <button
            key={dow}
            onClick={() => onSelect(dow)}
            className="flex flex-col items-center gap-1"
          >
            <span className={cn('text-[11px] font-semibold',
              isToday ? 'text-[#ea580c]' : isSelected ? 'text-[#1e3a5f]' : 'text-gray-400'
            )}>
              {WEEK_DAYS_SHORT[i]}
            </span>
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold transition-colors',
              isToday ? 'bg-[#ea580c] text-white' :
              isDone && !isRest ? 'bg-[#22c55e] text-white' :
              isSelected ? 'border-2 border-[#1e3a5f] text-[#1e3a5f] bg-white' :
              hasSession ? 'bg-[#1e3a5f] text-white' :
              'bg-white text-gray-400 border border-gray-200'
            )}>
              {isDone && !isRest && !isToday ? '✓' : dateObj.getDate()}
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: unified DashboardCard strip */}
      <div className="hidden sm:block">
        <WeekDayStrip
          variant="cards"
          cells={dayData.map(({ i, session, gymLabel, dateObj, isToday, isRest, isDone }) => ({
            idx: i,
            dateNum: dateObj.getDate(),
            isToday,
            sessionType: session ? session.type : null,
            done: isDone,
            durationMin: session?.durationMin ?? 0,
            zoneTarget: session?.zoneTarget ?? '',
            label: session && !isRest
              ? (SESSION_NAMES[session.type] ?? SESSION_LABELS[session.type] ?? session.type) + (gymLabel ? ' + Gym' : '')
              : gymLabel ?? null,
            hasGym: !!gymLabel,
          } as WeekDayCell))}
          selectedIdx={selectedDow - 1}
          onCellClick={(idx) => onSelect(idx + 1)}
        />
      </div>
    </div>
  )
}


// ── NutritionCard (donut ring + mini macro rings) ────────────────────

const RING_SIZE = 110
const STROKE_WIDTH = 8
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const MINI_RING_SIZE = 36
const MINI_STROKE = 3
const MINI_RADIUS = (MINI_RING_SIZE - MINI_STROKE) / 2
const MINI_CIRCUM = 2 * Math.PI * MINI_RADIUS

function CalorieRingSvg({ consumed, target }: { consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0
  const offset = CIRCUMFERENCE * (1 - pct)
  const remaining = Math.max(0, target - consumed)
  const over = consumed > target

  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0">
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke="#f3f4f6" strokeWidth={STROKE_WIDTH} fill="none" />
        <circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={over ? '#ef4444' : '#ea5807'}
          strokeWidth={STROKE_WIDTH} fill="none"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {consumed === 0 ? (
          <>
            <span className="text-[18px] font-black leading-none text-[#b3b3b3]">0</span>
            <span className="text-[8px] font-medium text-[#8c99a6] text-center leading-tight mt-0.5">kcal</span>
          </>
        ) : (
          <>
            <span className={cn('text-[18px] font-black leading-none', over ? 'text-red-500' : 'text-[#1e3a5f]')}>
              {(remaining > 0 ? remaining : Math.round(consumed - target)).toLocaleString('es')}
            </span>
            <span className="text-[8px] font-medium text-gray-400 text-center leading-tight mt-0.5">
              {remaining > 0 ? 'kcal\nrestantes' : 'kcal\nextra'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function MiniMacroRingSvg({ value, max, color, label, bgColor = '#f3f4f6' }: { value: number; max: number; color: string; label: string; bgColor?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const offset = MINI_CIRCUM * (1 - pct)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: MINI_RING_SIZE, height: MINI_RING_SIZE }}>
        <svg width={MINI_RING_SIZE} height={MINI_RING_SIZE} viewBox={`0 0 ${MINI_RING_SIZE} ${MINI_RING_SIZE}`}>
          <circle cx={MINI_RING_SIZE / 2} cy={MINI_RING_SIZE / 2} r={MINI_RADIUS} stroke={bgColor} strokeWidth={MINI_STROKE} fill="none" />
          <circle
            cx={MINI_RING_SIZE / 2} cy={MINI_RING_SIZE / 2} r={MINI_RADIUS}
            stroke={color} strokeWidth={MINI_STROKE} fill="none"
            strokeDasharray={MINI_CIRCUM} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${MINI_RING_SIZE / 2} ${MINI_RING_SIZE / 2})`}
          />
        </svg>
      </div>
      <span className="text-[11px] font-bold text-[#1e3a5f]">{Math.round(value)}g</span>
      <span className="text-[9px] text-gray-400">{label}</span>
    </div>
  )
}

function NutritionCard({ nt }: { nt: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } }) {
  const macros = [
    { label: 'Proteína', value: `${nt.proteinG} g`, color: '#3b82f6' },
    { label: 'Carbos', value: `${nt.carbsG} g`, color: '#22c55e' },
    { label: 'Grasas', value: `${nt.fatG} g`, color: '#f97316' },
    { label: 'Agua', value: '2.5 L', color: '#06b6d4' },
  ]

  return (
    <a href="/nutrition" className="block bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 hover:shadow-lg transition-shadow">
      {/* Desktop: barras de color (Figma web) */}
      <div className="hidden sm:block">
        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Nutrición hoy</p>
        <div className="flex items-end gap-6">
          <div className="shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-black text-[#1e3a5f] leading-none">
                {nt.kcal.toLocaleString('es')}
              </span>
              <span className="text-[12px] text-gray-400">kcal</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{nt.label}</p>
          </div>
          <div className="flex flex-1 gap-3">
            {macros.map(m => (
              <div key={m.label} className="flex-1 text-center">
                <p className="text-[9px] font-semibold mb-1" style={{ color: m.color }}>{m.label}</p>
                <p className="text-[15px] font-bold text-gray-900">{m.value}</p>
                <div className="w-full h-[3px] rounded-full mt-1.5" style={{ backgroundColor: m.color }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Mobile: donut + mini rings */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center gap-5">
          <CalorieRingSvg consumed={0} target={nt.kcal} />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Objetivo diario</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[28px] font-black text-[#1e3a5f] leading-none tracking-tight">
                {nt.kcal.toLocaleString('es')}
              </span>
              <span className="text-[11px] text-gray-400">kcal objetivo</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Sin registros hoy</p>
            <div className="flex items-center justify-between mt-3 pr-2">
              <MiniMacroRingSvg value={0} max={nt.proteinG} color="#3b82f6" bgColor="#edf2ff" label="Prot" />
              <MiniMacroRingSvg value={0} max={nt.carbsG} color="#eab308" bgColor="#fef9c3" label="Carbs" />
              <MiniMacroRingSvg value={0} max={nt.fatG} color="#22c55e" bgColor="#dcfce7" label="Grasas" />
            </div>
          </div>
        </div>
      </div>
    </a>
  )
}

// ── KPICards ──────────────────────────────────────────────────────────

function KPICards({ completed, total, volumeLabel, adherencePct, isGym }: {
  completed: number; total: number; volumeLabel: string; adherencePct: number | null; isGym: boolean
}) {
  const belowTarget = adherencePct !== null && adherencePct < 80
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Completadas</p>
        <p className="text-[20px] font-black leading-none text-gray-900">{completed}/{total}</p>
        <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sesiones</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Volumen</p>
        <p className="text-[20px] font-black leading-none text-gray-900">{volumeLabel}</p>
        <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">esta semana</p>
      </div>
      <div className={cn('bg-white rounded-xl shadow-sm p-3', belowTarget ? 'border-2 border-[#ea580c]/30' : 'border border-gray-100')}>
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Adherencia</p>
        <p className="text-[20px] font-black leading-none text-[#ea580c]">
          {adherencePct !== null ? `${adherencePct}%` : '—'}
        </p>
        <p className={cn('text-[10px] mt-1 whitespace-nowrap', belowTarget ? 'text-red-500' : 'text-gray-400')}>
          {belowTarget ? '↓ meta 80%' : 'esta semana'}
        </p>
      </div>
    </div>
  )
}

// ── PhaseProgress (colored segment bars — matches Figma) ─────────────

const PHASE_COLORS: Record<string, string> = {
  BASE: '#3b82f6', DESARROLLO: '#22c55e', ESPECIFICO: '#f97316', AFINAMIENTO: '#ef4444',
}
const PHASE_LABELS: Record<string, string> = {
  BASE: 'Base', DESARROLLO: 'Desarrollo', ESPECIFICO: 'Específico', AFINAMIENTO: 'Afinamiento',
}
const PHASE_LABELS_GYM: Record<string, string> = {
  BASE: 'Adaptación', DESARROLLO: 'Volumen', ESPECIFICO: 'Intensidad', AFINAMIENTO: 'Pico',
}

function PhaseBar({ allPhases, currentPhase, currentWeekNum, totalWeeks, weeks, isGymPlan }: {
  allPhases: string[]; currentPhase: string; currentWeekNum: number; totalWeeks: number; weeks: PlanClientWeek[]; isGymPlan?: boolean
}) {
  // Always show all 4 phases — highlight those present in the plan
  const display = PHASES_ORDER
  const pct = Math.round((currentWeekNum / totalWeeks) * 100)
  const activeIdx = display.indexOf(currentPhase)
  const labels = isGymPlan ? PHASE_LABELS_GYM : PHASE_LABELS

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-gray-900">Progreso del plan</span>
        <span className="text-[11px] text-gray-400">Sem. {currentWeekNum}/{totalWeeks} · {pct}%</span>
      </div>
      {/* Phase pills — Figma style */}
      <div className="flex gap-2">
        {display.map((phase, idx) => {
          const isActive = idx === activeIdx
          const isDone = idx < activeIdx
          const count = weeks.filter(w => w.phase === phase).length || 1
          const color = PHASE_COLORS[phase] ?? '#9ca3af'
          const shortLabel = (labels[phase] ?? phase).length > 8
            ? (labels[phase] ?? phase).slice(0, 7) + '.'
            : labels[phase] ?? phase
          const pillStyle = isActive || isDone
            ? { flex: count, backgroundColor: color }
            : { flex: count }
          return (
            <div
              key={phase}
              style={pillStyle}
              className={cn(
                'py-2 rounded-lg text-center text-[11px] font-semibold transition-colors',
                isActive && 'text-white',
                isDone && 'text-white opacity-70',
                !isActive && !isDone && 'border border-gray-200 text-gray-400',
              )}
            >
              {isDone ? '✓ ' : ''}{shortLabel}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AdherenceCompact (7-day blocks — matches Figma) ──────────────────

const DAY_LABELS_COMPACT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function AdherenceChart({ weeks, currentWeekNum, totalWeeks, todayDow, loggedIds }: {
  weeks: PlanClientWeek[]; currentWeekNum: number; totalWeeks: number; todayDow: number; loggedIds: Set<string>
}) {
  const currentWeek = weeks.find(w => w.weekNumber === currentWeekNum)

  // Empty state — no sessions for this week
  if (!currentWeek || currentWeek.sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-bold text-gray-900">Adherencia semanal</span>
          <span className="text-[11px] text-gray-400">Sin datos</span>
        </div>
        <div className="flex gap-1.5">
          {DAY_LABELS_COMPACT.map(d => (
            <div key={d} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-[22px] rounded-md bg-gray-100" />
              <span className="text-[10px] font-medium text-gray-400">{d}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const dow = i + 1
    const session = currentWeek.sessions.find(s => s.dayOfWeek === dow)
    const isRest = !session || session.type === 'DESCANSO'
    const isFuture = dow > todayDow
    const isToday = dow === todayDow
    const isDone = session?.done || loggedIds.has(session?.id ?? '')

    let status: 'done' | 'missed' | 'rest' | 'future' | 'today'
    if (isRest) status = 'rest'
    else if (isFuture) status = 'future'
    else if (isToday && !isDone) status = 'today'
    else if (isDone) status = 'done'
    else status = 'missed'

    return { dow, label: DAY_LABELS_COMPACT[i], status }
  })

  const completedDays = days.filter(d => d.status === 'done').length
  const trainingDays = days.filter(d => d.status !== 'rest' && d.status !== 'future').length
  const pct = trainingDays > 0 ? Math.round((completedDays / trainingDays) * 100) : 0

  const statusColors: Record<string, string> = {
    done: '#22c55e', missed: '#ef4444', rest: '#e5e7eb', future: '#f3f4f6', today: '#f97316',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[12px] font-bold text-gray-900">Adherencia semanal</span>
        <span className="text-[11px] text-gray-400">{pct}%</span>
      </div>
      <div className="flex gap-1.5">
        {days.map(({ dow, label, status }) => (
          <div key={dow} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-md"
              style={{ height: 22, backgroundColor: statusColors[status] }}
            />
            <span className={cn(
              'text-[10px] font-medium',
              status === 'done' ? 'text-green-600' :
              status === 'today' ? 'text-[#ea580c]' :
              'text-gray-400'
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── BodyCompositionCard ───────────────────────────────────────────────

function BodyCompositionCard({ weightData, bodyMeasures }: {
  weightData: { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null } | null
  bodyMeasures?: { waistCm: number | null; hipsCm: number | null; armsCm: number | null; thighsCm: number | null } | null
}) {
  const hasData = weightData?.currentKg != null || bodyMeasures != null
  const { currentKg, goalKg, weeklyChange } = weightData ?? { currentKg: null, goalKg: null, weeklyChange: null }

  const changeBadge = weeklyChange !== null && weeklyChange !== 0
    ? {
        label: `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg/sem · ${Math.abs(weeklyChange) <= 1 ? 'ritmo ideal' : 'ritmo alto'}`,
        color: weeklyChange < 0 ? 'text-green-600' : weeklyChange > 0.5 ? 'text-red-500' : 'text-orange-500',
        bg: weeklyChange < 0 ? 'bg-green-50' : weeklyChange > 0.5 ? 'bg-red-50' : 'bg-orange-50',
      }
    : null

  const allMeasures = [
    { label: 'Cintura', value: bodyMeasures?.waistCm ?? null },
    { label: 'Cadera', value: bodyMeasures?.hipsCm ?? null },
    { label: 'Brazos', value: bodyMeasures?.armsCm ?? null },
    { label: 'Muslo', value: bodyMeasures?.thighsCm ?? null },
  ]
  const measures = hasData ? allMeasures.filter(m => m.value != null) : allMeasures

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-bold text-gray-900">Composición corporal</span>
        {changeBadge && (
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', changeBadge.color, changeBadge.bg)}>
            ↓ {changeBadge.label}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[24px] font-black text-gray-900 tracking-tight">
          {currentKg != null ? `${currentKg} kg` : '— kg'}
        </span>
        {goalKg != null && <span className="text-[12px] text-gray-400">→ meta {goalKg} kg</span>}
        {!hasData && <span className="text-[11px] text-gray-300">Sin datos registrados</span>}
      </div>

      <div className="flex gap-2">
        {measures.map(m => (
          <div key={m.label} className="flex-1 text-center">
            <span className="text-[15px] font-bold text-gray-900">
              {m.value != null ? `${m.value} cm` : '— cm'}
            </span>
            <p className="text-[9px] text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── EstadoSemana (check-in metrics) ──────────────────────────────────

function EstadoSemana({ checkInData }: {
  checkInData: { energyLevel: number | null; sleepHours: number | null; stressLevel: number | null; motivationLevel: number | null } | null
}) {
  const { energyLevel, sleepHours, stressLevel, motivationLevel } = checkInData ?? {}

  const items = [
    { label: 'Energía', value: energyLevel ? `${energyLevel}/5` : '—', icon: '⚡' },
    { label: 'Sueño', value: sleepHours ? `${sleepHours}h` : '—', icon: '😴' },
    { label: 'Estrés', value: stressLevel ? `${stressLevel}/5` : '—', icon: '😤' },
    { label: 'Motiv.', value: motivationLevel ? `${motivationLevel}/5` : '—', icon: '💪' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className="text-[13px] font-bold text-gray-900 block mb-3">Tu estado esta semana</span>
      <div className="flex gap-3">
        {items.map(i => (
          <div key={i.label} className="flex-1 text-center">
            <span className="text-[16px] block mb-1">{i.icon}</span>
            <span className="text-[14px] font-bold text-gray-900 block">{i.value}</span>
            <span className="text-[9px] text-gray-400">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ZonasFC (heart rate zones) ───────────────────────────────────────

type HRZoneData = { z1: { min: number; max: number }; z2: { min: number; max: number }; z3: { min: number; max: number }; z4: { min: number; max: number }; z5: { min: number; max: number } }

function ZonasFC({ hrZones }: { hrZones: HRZoneData | null | undefined }) {
  const defaultColors = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#dc2626']
  const zones = hrZones
    ? [
        { label: 'Z1', range: `${hrZones.z1.min}-${hrZones.z1.max}`, color: '#3b82f6' },
        { label: 'Z2', range: `${hrZones.z2.min}-${hrZones.z2.max}`, color: '#22c55e' },
        { label: 'Z3', range: `${hrZones.z3.min}-${hrZones.z3.max}`, color: '#f97316' },
        { label: 'Z4', range: `${hrZones.z4.min}-${hrZones.z4.max}`, color: '#ef4444' },
        { label: 'Z5', range: `${hrZones.z5.min}+`, color: '#dc2626' },
      ]
    : ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((l, i) => ({ label: l, range: '— bpm', color: defaultColors[i] }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className="text-[13px] font-bold text-gray-900 block mb-3">Zonas FC</span>
      {!hrZones && <p className="text-[10px] text-gray-300 -mt-1 mb-2">Completa tu perfil con FC máx para calcular tus zonas</p>}
      <div className="flex gap-2">
        {zones.map(z => (
          <div key={z.label} className="flex-1 text-center">
            <div className={cn('w-2.5 h-2.5 rounded-full mx-auto mb-1.5', !hrZones && 'opacity-30')} style={{ backgroundColor: z.color }} />
            <span className="text-[11px] font-bold text-gray-900 block">{z.label}</span>
            <span className={cn('text-[9px]', hrZones ? 'text-gray-400' : 'text-gray-300')}>{z.range}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CheckInBanner ────────────────────────────────────────────────────

function CheckInBanner({ recordedAt }: { recordedAt: string | null }) {
  if (!recordedAt) {
    return (
      <a href="/checkin" className="flex items-center gap-2 text-[11px] text-gray-300 hover:text-gray-500 transition-colors mt-2">
        <span>📊</span>
        <span>Sin check-ins registrados · Haz tu primer check-in semanal</span>
      </a>
    )
  }
  const d = new Date(recordedAt)
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`
  return (
    <a href="/checkin" className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors mt-2">
      <span>📊</span>
      <span>Último check-in: {label} · Datos del check-in semanal</span>
    </a>
  )
}

// ── PlanClient ────────────────────────────────────────────────────────

export default function PlanClient({ plan, weeks, nutritionTarget, weightData, checkInData, bodyMeasures, hrZones }: PlanClientProps) {
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
  const weekLabel = formatWeekRange(weekMonday)

  const selectedSession = useMemo(() => {
    const s = week?.sessions.find(s => s.dayOfWeek === selectedDow) ?? null
    return s ? mergeSession(s) : null
  }, [week, selectedDow, editedSessions])

  // KPI — combina done del servidor + loggedIds optimista
  const completedCount = week?.sessions.filter(s => (s.done || loggedIds.has(s.id)) && s.type !== 'DESCANSO').length ?? 0
  const totalTraining  = week?.sessions.filter(s => s.type !== 'DESCANSO').length ?? 0
  // BUG-059: null cuando no hay sesiones planificadas — evitar mostrar 0% engañoso
  const adherencePct: number | null = totalTraining > 0 ? Math.round((completedCount / totalTraining) * 100) : null

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
    <>
    {/* ══════ MOBILE (< sm) — Figma 2008:203 / 2145:218 ══════ */}
    <div className="sm:hidden min-h-screen bg-[#f1f5f9]">
      {/* Header — navy gradient */}
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] pb-3 px-5 pt-[max(env(safe-area-inset-top,0px),20px)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-[20px] font-bold text-white leading-tight">Mi Plan</h1>
            <p className="text-[11px] text-white/60 mt-0.5">
              Plan {formatPlanName(plan.name)} · {plan.totalWeeks} semanas
            </p>
          </div>
          <div className="bg-white/15 text-white px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap">
            {realCurrentPhase} · Sem {plan.currentWeek}/{plan.totalWeeks}
          </div>
        </div>

        {/* Week Nav */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white/10 rounded-xl h-10">
            <button
              onClick={() => { setSelectedWeekNum(w => Math.max(1, w - 1)); setSelectedDow(todayDow) }}
              disabled={selectedWeekNum <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="flex-1 text-[13px] font-semibold text-white text-center whitespace-nowrap">
              Semana {selectedWeekNum} · {weekLabel}
            </span>
            {!isCurrentWeek && (
              <button
                onClick={() => { setSelectedWeekNum(plan.currentWeek); setSelectedDow(todayDow) }}
                className="text-[12px] font-bold text-white bg-[#ea580c] px-3 py-1 rounded-full transition-colors hover:bg-[#d14d07]"
              >
                Hoy
              </button>
            )}
            <button
              onClick={() => { setSelectedWeekNum(w => Math.min(plan.totalWeeks, w + 1)); setSelectedDow(1) }}
              disabled={selectedWeekNum >= plan.totalWeeks}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Day Pills */}
      <div className="px-4 pt-4 pb-4">
        {/* Segmented progress bar */}
        <div className="flex gap-[3px] mb-2">
          {Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1
            const s = week?.sessions.find(x => x.dayOfWeek === dow) ?? null
            const isRest = !s || s.type === 'DESCANSO'
            const isDone = (s?.done || (s ? loggedIds.has(s.id) : false)) ?? false
            return (
              <div key={`bar-${i}`} className={`h-[3px] flex-1 rounded-full ${isDone && !isRest ? 'bg-[#22c55e]' : 'bg-gray-200'}`} />
            )
          })}
        </div>
        <div className="flex justify-between py-3">
          {Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1
            const s = week?.sessions.find(x => x.dayOfWeek === dow) ?? null
            const dateObj = new Date(weekMonday.getTime() + i * 86400000)
            const isToday = isCurrentWeek && dow === todayDow
            const isSel = dow === selectedDow
            const isDone = (s?.done || (s ? loggedIds.has(s.id) : false)) ?? false
            const isRest = !s || s.type === 'DESCANSO'

            return (
              <button key={dow} onClick={() => setSelectedDow(dow)} className="flex flex-col items-center gap-1">
                <span className={cn('text-[11px] font-semibold',
                  isToday ? 'text-[#ea580c]' : isSel ? 'text-[#1e3a5f]' : 'text-gray-400'
                )}>
                  {WEEK_DAYS_SHORT[i]}
                </span>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold transition-colors',
                  isToday ? 'bg-[#ea580c] text-white' :
                  isDone && !isRest ? 'bg-[#22c55e] text-white' :
                  isSel ? 'border-2 border-[#1e3a5f] text-[#1e3a5f] bg-white' :
                  s && !isRest ? 'bg-[#1e3a5f] text-white' :
                  'bg-white text-gray-400 border border-gray-200'
                )}>
                  {dateObj.getDate()}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 pb-24">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {selDayLabel} · Sesión del día
        </p>

        {selectedSession ? (
          <SessionDetailCard
            key={`m-${selectedSession.id}`}
            session={selectedSession}
            isToday={isCurrentWeek && selectedDow === todayDow}
            isLogged={loggedIds.has(selectedSession.id)}
            onLogged={() => markLogged(selectedSession.id)}
            onEdited={(updates) => applyEdit(selectedSession.id, updates)}
          />
        ) : (!week || week.sessions.filter(s => s.type !== 'DESCANSO').length === 0) ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <p className="text-[16px] font-bold text-gray-700">Semana sin sesiones</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Tu coach aún no ha planificado esta semana</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-3">
            <span className="text-3xl">😴</span>
            <div>
              <p className="text-[16px] font-bold text-gray-700">Día de descanso</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Aprovecha para recuperar bien hoy</p>
            </div>
          </div>
        )}

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta semana</p>

        <KPICards
          completed={completedCount}
          total={totalTraining}
          volumeLabel={volumeLabel}
          adherencePct={adherencePct}
          isGym={isGym}
        />

        {/* Figma order: KPI → Phase → Adherence → Nutrition → Body */}
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

        {nutritionTarget && <NutritionCard nt={nutritionTarget} />}

        <BodyCompositionCard weightData={weightData} bodyMeasures={bodyMeasures} />

        <EstadoSemana checkInData={checkInData ?? null} />

        <ZonasFC hrZones={hrZones} />

        <CheckInBanner recordedAt={checkInData?.recordedAt ?? null} />
      </div>
    </div>

    {/* ══════ DESKTOP (sm+) ══════ */}
    <div className="hidden sm:block px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-5">

      {/* ── WeekSection card (Figma: TopBar + ProgressBar + DaysRow + Footer) ── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <PageTopBar
          title="Mi Plan"
          subtitle={`${formatPlanName(plan.name)} · ${plan.totalWeeks} semanas`}
          center={
            <WeekNavBar
              weekLabel={weekLabel}
              canGoPrev={selectedWeekNum > 1}
              canGoNext={selectedWeekNum < plan.totalWeeks}
              onPrev={() => { setSelectedWeekNum(w => Math.max(1, w - 1)); setSelectedDow(todayDow) }}
              onNext={() => { setSelectedWeekNum(w => Math.min(plan.totalWeeks, w + 1)); setSelectedDow(1) }}
              onToday={() => { setSelectedWeekNum(plan.currentWeek); setSelectedDow(todayDow) }}
              showToday={!isCurrentWeek}
            />
          }
          right={
            <span className="inline-flex items-center bg-[#1e3a5f] text-white px-3.5 py-1.5 rounded-[20px] text-[11px] font-semibold whitespace-nowrap">
              {realCurrentPhase} · {selectedWeekNum} / {plan.totalWeeks}
            </span>
          }
        />

        {/* Progress bar */}
        <div className="px-5">
          <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ea580c] rounded-full transition-all duration-500"
              style={{ width: `${Math.round((plan.currentWeek / plan.totalWeeks) * 100)}%` }}
            />
          </div>
        </div>

        {/* Calendar Strip */}
        <div className="px-3 pt-3">
          <CalendarStrip
            week={week}
            calendarDays={calWeek?.days ?? null}
            weekMonday={weekMonday}
            selectedDow={selectedDow}
            todayDow={todayDow}
            isCurrentWeek={isCurrentWeek}
            onSelect={setSelectedDow}
            loggedIds={loggedIds}
          />
        </div>

        {/* Footer — session count */}
        <div className="px-5 pb-3 flex justify-end">
          <span className="text-[12px] text-gray-400 font-medium">
            {completedCount} / {totalTraining} sesiones
          </span>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-5">

        {/* Left (3/5) */}
        <div className="xl:col-span-3 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {selDayLabel} · Sesión del día
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
          ) : (!week || week.sessions.filter(s => s.type !== 'DESCANSO').length === 0) ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center gap-4">
              <span className="text-4xl">📋</span>
              <div>
                <p className="text-[18px] font-bold text-gray-700">Semana sin sesiones definidas</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Tu coach aún no ha planificado las sesiones de esta semana</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center gap-4">
              <span className="text-4xl">😴</span>
              <div>
                <p className="text-[18px] font-bold text-gray-700">Día de descanso</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Aprovecha para recuperar bien hoy</p>
              </div>
            </div>
          )}

        </div>

        {/* Right (2/5) */}
        <div className="xl:col-span-2 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Esta semana
          </p>

          <KPICards
            completed={completedCount}
            total={totalTraining}
            volumeLabel={volumeLabel}
            adherencePct={adherencePct}
            isGym={isGym}
          />

          {/* Figma order: KPI → Phase → Adherence → Nutrition → Body */}
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

          {nutritionTarget && <NutritionCard nt={nutritionTarget} />}

          <BodyCompositionCard weightData={weightData} bodyMeasures={bodyMeasures} />

          <div className="grid grid-cols-2 gap-3">
            <EstadoSemana checkInData={checkInData ?? null} />
            <ZonasFC hrZones={hrZones} />
          </div>
        </div>
      </div>

      <CheckInBanner recordedAt={checkInData?.recordedAt ?? null} />
    </div>
    </>
  )
}
