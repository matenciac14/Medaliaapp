'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarWeek, CalendarDay } from '@/domain/calendar/calendar.types'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const SESSION_COLORS: Record<string, string> = {
  RODAJE_Z2:    'bg-blue-500',
  FARTLEK:      'bg-blue-600',
  TEMPO:        'bg-amber-500',
  INTERVALOS:   'bg-orange-600',
  TIRADA_LARGA: 'bg-indigo-500',
  SIMULACRO:    'bg-purple-600',
  TEST:         'bg-purple-500',
  FUERZA:       'bg-emerald-600',
  DESCANSO:     'bg-gray-300',
  OTRO:         'bg-gray-500',
}

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2:    'Rodaje Z2',
  FARTLEK:      'Fartlek',
  TEMPO:        'Tempo',
  INTERVALOS:   'Intervalos',
  TIRADA_LARGA: 'Tirada Larga',
  SIMULACRO:    'Simulacro',
  TEST:         'Test',
  FUERZA:       'Fuerza',
  DESCANSO:     'Descanso',
  OTRO:         'Entrenamiento',
}

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃', FARTLEK: '🏃', TIRADA_LARGA: '🏃', TEMPO: '🏃',
  INTERVALOS: '⚡', SIMULACRO: '🏁', TEST: '📊',
  FUERZA: '💪', DESCANSO: '😴', OTRO: '🏅',
}

// ── Day dot ───────────────────────────────────────────────────────────────────

function ActivityDots({ day }: { day: CalendarDay }) {
  const dots: { color: string; key: string }[] = []

  if (day.sport && day.sport.type !== 'DESCANSO') {
    dots.push({ color: SESSION_COLORS[day.sport.type] ?? 'bg-blue-400', key: 'sport' })
  }
  if (day.gym) {
    dots.push({ color: 'bg-emerald-500', key: 'gym' })
  }
  if (day.freeRun) {
    dots.push({ color: 'bg-sky-400', key: 'free' })
  }

  if (dots.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-0.5 mt-0.5">
      {dots.map(d => (
        <span key={d.key} className={cn('w-1.5 h-1.5 rounded-full', d.color)} />
      ))}
    </div>
  )
}

// ── Day cell ──────────────────────────────────────────────────────────────────

function DayCell({
  day,
  isToday,
  isSelected,
  onClick,
}: {
  day: CalendarDay
  isToday: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const hasActivity = !!(day.sport || day.gym || day.freeRun)
  const allDone =
    (!day.sport || day.sport.done) &&
    (!day.gym || day.gym.done) &&
    (!day.freeRun) // free runs are always done (past)

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-start pt-2 pb-1 rounded-xl border transition-all min-h-[64px] w-full',
        isSelected
          ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 ring-1 ring-[#1e3a5f]/30'
          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50',
        isToday && !isSelected && 'border-[#ea580c]/40 bg-orange-50/40'
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium',
          isToday
            ? 'bg-[#ea580c] text-white font-bold'
            : isSelected
            ? 'bg-[#1e3a5f] text-white'
            : 'text-gray-700'
        )}
      >
        {day.dateNum}
      </span>

      {/* Done indicator */}
      {hasActivity && allDone && (
        <CheckCircle2 size={12} className="text-emerald-500 mt-0.5" strokeWidth={2.5} />
      )}

      {/* Activity dots */}
      {hasActivity && !allDone && <ActivityDots day={day} />}
    </button>
  )
}

// ── Session detail panel ──────────────────────────────────────────────────────

function SessionDetail({ day }: { day: CalendarDay }) {
  const hasAnything = !!(day.sport || day.gym || day.freeRun)

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <span className="text-3xl mb-2">😴</span>
        <p className="text-sm text-gray-500">Sin actividad este día</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Sport session */}
      {day.sport && day.sport.type !== 'DESCANSO' && (
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{SESSION_ICONS[day.sport.type] ?? '🏅'}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {SESSION_LABELS[day.sport.type] ?? day.sport.type}
                </p>
                {day.sport.durationMin > 0 && (
                  <p className="text-xs text-gray-400">{day.sport.durationMin} min</p>
                )}
              </div>
            </div>
            {day.sport.done
              ? <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={2.5} />
              : <Circle size={18} className="text-gray-300" strokeWidth={2} />
            }
          </div>

          {day.sport.zoneTarget && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {day.sport.zoneTarget.split(/[\s,]+/).map(z => (
                <span key={z} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                  {z}
                </span>
              ))}
            </div>
          )}

          {day.sport.detailText && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">{day.sport.detailText}</p>
          )}

          {/* Log summary */}
          {day.sport.done && day.sport.logDurationMin && (
            <div className="mt-3 pt-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
              <span>⏱ {day.sport.logDurationMin} min</span>
              {day.sport.logRpe && <span>RPE {day.sport.logRpe}/10</span>}
              {day.sport.logHrAvg && <span>FC {day.sport.logHrAvg} ppm</span>}
            </div>
          )}
        </div>
      )}

      {/* Gym session */}
      {day.gym && (
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💪</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{day.gym.label}</p>
                {day.gym.durationMin && (
                  <p className="text-xs text-gray-400">{day.gym.durationMin} min</p>
                )}
              </div>
            </div>
            {day.gym.done
              ? <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={2.5} />
              : <Circle size={18} className="text-gray-300" strokeWidth={2} />
            }
          </div>
        </div>
      )}

      {/* Free run */}
      {day.freeRun && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{SESSION_ICONS[day.freeRun.type] ?? '🏅'}</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {SESSION_LABELS[day.freeRun.type] ?? day.freeRun.type}{' '}
                <span className="text-xs font-normal text-sky-600 ml-1">sesión libre</span>
              </p>
              <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                {day.freeRun.durationMin && <span>{day.freeRun.durationMin} min</span>}
                {day.freeRun.distanceKm && <span>{day.freeRun.distanceKm} km</span>}
                {day.freeRun.rpe && <span>RPE {day.freeRun.rpe}/10</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlanCalendarView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [week, setWeek] = useState<CalendarWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const fetchWeek = useCallback(async (offset: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/athlete/calendar?weekOffset=${offset}`)
      const data: CalendarWeek = await res.json()
      setWeek(data)
      // Auto-select today when navigating to current week
      if (offset === 0) {
        setSelectedDate(todayStr)
      } else {
        setSelectedDate(null)
      }
    } catch {
      // silent — keep previous state
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => { fetchWeek(0) }, [fetchWeek])

  function goToPrev() {
    const next = weekOffset - 1
    setWeekOffset(next)
    fetchWeek(next)
  }

  function goToNext() {
    const next = weekOffset + 1
    setWeekOffset(next)
    fetchWeek(next)
  }

  function goToToday() {
    setWeekOffset(0)
    fetchWeek(0)
  }

  const selectedDay = week?.days.find(d => d.date === selectedDate) ?? null

  return (
    <div className="space-y-4">
      {/* ── Week navigation ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrev}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">
            {loading ? '...' : (week?.label ?? '')}
          </p>
          {weekOffset !== 0 && (
            <button
              onClick={goToToday}
              className="text-xs text-[#ea580c] hover:underline mt-0.5"
            >
              Ir a esta semana
            </button>
          )}
        </div>

        <button
          onClick={goToNext}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Semana siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Day labels ── */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map(label => (
          <div key={label} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-1">
            {label}
          </div>
        ))}
      </div>

      {/* ── Day cells ── */}
      <div className="grid grid-cols-7 gap-1">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 animate-pulse min-h-[64px]" />
            ))
          : (week?.days ?? []).map(day => (
              <DayCell
                key={day.date}
                day={day}
                isToday={day.date === todayStr}
                isSelected={day.date === selectedDate}
                onClick={() => setSelectedDate(prev => prev === day.date ? null : day.date)}
              />
            ))
        }
      </div>

      {/* ── Selected day detail ── */}
      {selectedDay && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">
              {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              Cerrar
            </button>
          </div>
          <SessionDetail day={selectedDay} />
        </div>
      )}
    </div>
  )
}
