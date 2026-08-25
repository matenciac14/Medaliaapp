'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import type { CalendarWeek, CalendarDay } from '@/domain/calendar/calendar.types'
import { calendarDaysToWeekCells, type WeekDayCell } from './week-day-cells'
import WeekDayStrip from './WeekDayStrip'
import { jsToWeekIdx } from '@/lib/core/date-utils'
import { SESSION_ICONS } from '@/lib/constants/sessions'

interface Props {
  weekOffset: number
  /** Dashboard mode — determines detail card behavior */
  dashboardMode?: 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM'
  /** Athlete first name for CTA fallback */
  firstName?: string
  /** Week label for mobile header (e.g. "10–16 ago") */
  weekLabel?: string
  /** Registration/session count for mobile header */
  mobileCount?: string
}

export default function DashboardCalendarStrip({ weekOffset, dashboardMode = 'FREE', firstName = '', weekLabel = '', mobileCount = '' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const todayWeekIdx = jsToWeekIdx(new Date().getDay())
  const isCurrentWeek = weekOffset === 0

  function navigateWeek(delta: number) {
    const next = weekOffset + delta
    router.push(next === 0 ? pathname : `${pathname}?weekOffset=${next}`)
  }

  const [cells, setCells] = useState<WeekDayCell[]>(() =>
    Array.from({ length: 7 }, (_, idx) => ({
      idx,
      dateNum: 0,
      isToday: isCurrentWeek && idx === todayWeekIdx,
      sessionType: null,
      done: false,
      durationMin: 0,
      zoneTarget: '',
      label: null,
      gymOverlay: null,
      gymOverlayDone: false,
    }))
  )
  const [days, setDays] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ completed: 0, total: 0 })
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/athlete/calendar?weekOffset=${weekOffset}`)
      .then(r => r.json())
      .then((week: CalendarWeek) => {
        const todayIdx = isCurrentWeek ? todayWeekIdx : -1
        const nextCells = calendarDaysToWeekCells(week.days, todayIdx)
        setCells(nextCells)
        setDays(week.days)

        const training = nextCells.filter(c => c.sessionType && c.sessionType !== 'DESCANSO')
        setStats({
          completed: training.filter(c => c.done).length,
          total: training.length,
        })

        // Auto-select today if current week, otherwise first day with a session
        if (isCurrentWeek) {
          setSelectedIdx(todayIdx)
        } else {
          const firstWithSession = nextCells.findIndex(c => c.sessionType && c.sessionType !== 'DESCANSO')
          setSelectedIdx(firstWithSession >= 0 ? firstWithSession : 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weekOffset])

  const progressPct = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  // Find the CalendarDay for the selected index
  const selectedDay = selectedIdx !== null && days.length > 0
    ? days.find(d => d.weekIdx === selectedIdx) ?? null
    : null

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* Mobile: Figma-style card with header + nav + dots */}
      <div className="sm:hidden space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold text-gray-900 uppercase tracking-wide">ESTA SEMANA</h2>
          <span className="text-[11px] font-semibold text-gray-400">{mobileCount}</span>
        </div>
        {/* Week nav row — arrows at edges, label centered */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek(-1)}
            className="w-7 h-7 rounded-[8px] bg-gray-100 flex items-center justify-center text-gray-400 text-sm"
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-700">{weekLabel}</span>
            {!isCurrentWeek && (
              <button
                onClick={() => router.push(pathname)}
                className="text-[11px] font-semibold text-[#ea580c] bg-[#fff7ed] px-2.5 py-1 rounded-lg"
              >
                Hoy
              </button>
            )}
          </div>
          <button
            onClick={() => navigateWeek(1)}
            className="w-7 h-7 rounded-[8px] bg-gray-100 flex items-center justify-center text-gray-400 text-sm"
          >
            ›
          </button>
        </div>
        {/* Progress bar */}
        {stats.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[5px] bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#22c55e] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 tabular-nums shrink-0">
              {stats.completed}/{stats.total}
            </span>
          </div>
        )}
        {/* Dot strip */}
        <WeekDayStrip
          cells={cells}
          variant="dots"
          selectedIdx={selectedIdx ?? undefined}
          todayIdx={isCurrentWeek ? todayWeekIdx : -1}
          onCellClick={(idx) => {
            setSelectedIdx(idx)
            if (!isCurrentWeek) return
            const cell = cells[idx]
            if (!cell || cell.done || !cell.sessionType || cell.sessionType === 'DESCANSO') return
            if (idx >= todayWeekIdx) return
            // Past unlogged session — navigate to log
            const day = days.find(d => d.weekIdx === idx)
            if (!day?.sport) return
            const params = new URLSearchParams({
              sessionId: day.sport.sessionId,
              type: day.sport.type,
              duration: String(day.sport.durationMin),
              zone: day.sport.zoneTarget ?? '2',
            })
            router.push(`/log/run?${params}`)
          }}
        />
        {/* Hint for past unlogged sessions */}
        {isCurrentWeek && cells.some(c => c.idx < todayWeekIdx && c.sessionType && c.sessionType !== 'DESCANSO' && !c.done) && (
          <p className="text-[9px] text-[#f97316] text-center">
            Toca ! para registrar sesiones pasadas
          </p>
        )}
        {/* Detail card — mobile */}
        {selectedDay && (
          <MobileDotDetail day={selectedDay} />
        )}
      </div>
      {/* Desktop: rich card columns */}
      <div className="hidden sm:block">
        <WeekDayStrip
          cells={cells}
          variant="cards"
          selectedIdx={selectedIdx ?? undefined}
          onCellClick={setSelectedIdx}
        />
      </div>
      {/* Detail card — desktop only */}
      <div className="hidden sm:block">
        {selectedDay && (
          <SelectedDayDetail
            day={selectedDay}
            dashboardMode={dashboardMode}
            firstName={firstName}
            completedCount={stats.completed}
            totalSessions={stats.total}
          />
        )}
      </div>
    </div>
  )
}

// ── Detail card for selected day ──────────────────────────────────────────────

function SelectedDayDetail({ day, dashboardMode, firstName, completedCount, totalSessions }: {
  day: CalendarDay
  dashboardMode: string
  firstName: string
  completedCount: number
  totalSessions: number
}) {
  const { sport, gym, freeRun } = day
  const isRest = !!sport && sport.type === 'DESCANSO' && !gym
  const hasActiveSession = (!!sport && sport.type !== 'DESCANSO') || !!gym || !!freeRun

  // No active session (empty day or rest day without gym) — show fallback
  if (!hasActiveSession) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2.5">
        <div className="w-1 h-9 bg-[#22c55e] rounded-full shrink-0" />
        <span className="text-base">{isRest ? '😴' : '💪'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1e3a5f]">
            {isRest
              ? 'Día de descanso'
              : dashboardMode === 'FREE'
              ? `Tu espacio de entrenamiento está listo, ${firstName}`
              : 'Sin sesión programada'}
          </p>
          <p className="text-xs text-gray-500">
            {isRest
              ? 'Recuperación activa — tu cuerpo necesita este día.'
              : dashboardMode === 'FREE'
              ? 'Anota tu actividad de hoy y empieza a construir tu historial.'
              : 'Sin sesión programada para este día.'}
          </p>
        </div>
        {dashboardMode === 'FREE' && (
          <>
            <Link href="/find-coach" className="text-xs font-semibold text-[#1e3a5f] border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0">
              Conecta con un entrenador →
            </Link>
            <Link href="/routine/edit" className="text-xs font-semibold text-white bg-[#ea580c] px-4 py-2 rounded-xl hover:bg-[#d14d07] transition-colors whitespace-nowrap shrink-0">
              Arma tu rutina →
            </Link>
          </>
        )}
      </div>
    )
  }

  // Determine primary session info
  const isGymPrimary = !!gym && (!sport || sport.type === 'DESCANSO')
  const isSportPrimary = !!sport && sport.type !== 'DESCANSO'
  const isFreeRun = !isSportPrimary && !isGymPrimary && !!freeRun

  const sessionName = isSportPrimary
    ? (sport!.detailText ?? sport!.type.replace(/_/g, ' '))
    : isGymPrimary
    ? gym!.label
    : freeRun!.type.replace(/_/g, ' ')

  const emoji = isSportPrimary
    ? (SESSION_ICONS[sport!.type] ?? '🏃')
    : isGymPrimary
    ? '💪'
    : (SESSION_ICONS[freeRun!.type] ?? '🏃')

  const durationMin = isSportPrimary
    ? sport!.durationMin
    : isGymPrimary
    ? (gym!.durationMin ?? 0)
    : (freeRun!.durationMin ?? 0)

  const done = isSportPrimary
    ? sport!.done
    : isGymPrimary
    ? gym!.done
    : true

  const rpe = isSportPrimary
    ? sport!.logRpe
    : isGymPrimary
    ? gym!.rpe
    : freeRun?.rpe ?? null

  const sessionCategory = isSportPrimary ? 'Carrera' : isGymPrimary ? 'Entreno' : 'Carrera libre'

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {/* Row 1: Emoji + name + CTAs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <p className="text-sm font-semibold text-gray-900">{sessionName}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isSportPrimary && (
            <Link href="/plan" className="text-[11px] font-semibold text-[#1e3a5f] border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap">
              Ver plan →
            </Link>
          )}
          {isGymPrimary && (
            <Link href="/gym" className="text-[11px] font-semibold text-[#1e3a5f] border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap">
              Ver plan →
            </Link>
          )}
          {done ? (
            <span className="flex items-center gap-1 text-white text-[11px] font-semibold bg-[#22c55e] px-3 py-1.5 rounded-xl">
              <CheckCircle2 size={13} /> Completada
            </span>
          ) : (
            <Link href={isGymPrimary ? '/gym/session' : '/log/run'} className="text-[11px] font-semibold text-white bg-[#ea580c] px-3 py-1.5 rounded-xl hover:bg-[#d14d07] transition-colors whitespace-nowrap">
              Realizar sesión →
            </Link>
          )}
        </div>
      </div>
      {/* Row 2: Pills */}
      <div className="flex gap-1.5 flex-wrap items-center mt-2">
        {durationMin > 0 && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {durationMin} min
          </span>
        )}
        {isSportPrimary && sport!.zoneTarget && sport!.zoneTarget !== 'N/A' && sport!.zoneTarget !== '—' && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            Zona {sport!.zoneTarget}
          </span>
        )}
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
          {sessionCategory}
        </span>
        {rpe && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            RPE {rpe}
          </span>
        )}
        {isFreeRun && freeRun!.distanceKm && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {freeRun!.distanceKm} km
          </span>
        )}
        {totalSessions > 0 && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            {completedCount}/{totalSessions} completadas
          </span>
        )}
      </div>
    </div>
  )
}

// ── Mobile dot detail (sm:hidden viewport) ───────────────────────────────────

function MobileDotDetail({ day }: { day: CalendarDay }) {
  const { sport, gym, freeRun } = day
  const isRest = !!sport && sport.type === 'DESCANSO' && !gym
  const hasActive = (!!sport && sport.type !== 'DESCANSO') || !!gym || !!freeRun

  if (!hasActive && !isRest) return null

  const label = isRest
    ? 'Descanso'
    : sport && sport.type !== 'DESCANSO'
    ? (sport.detailText ?? sport.type.replace(/_/g, ' '))
    : gym
    ? gym.label
    : freeRun!.type.replace(/_/g, ' ')

  const emoji = isRest
    ? '😴'
    : sport && sport.type !== 'DESCANSO'
    ? (SESSION_ICONS[sport.type] ?? '🏃')
    : gym
    ? '💪'
    : (SESSION_ICONS[freeRun!.type] ?? '🏃')

  const durationMin = sport && sport.type !== 'DESCANSO'
    ? sport.durationMin
    : gym
    ? (gym.durationMin ?? 0)
    : (freeRun?.durationMin ?? 0)

  const done = sport && sport.type !== 'DESCANSO'
    ? sport.done
    : gym
    ? gym.done
    : true

  const zone = sport && sport.type !== 'DESCANSO' ? sport.zoneTarget : null

  return (
    <div className="flex items-center gap-2.5 mt-3 pt-2.5 border-t border-gray-100">
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900">{label}</p>
        <div className="flex gap-1.5 mt-1">
          {durationMin > 0 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
              {durationMin} min
            </span>
          )}
          {zone && zone !== 'N/A' && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
              Zona {zone}
            </span>
          )}
          {done && hasActive && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-green-100 text-green-600">
              ✓ Completada
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
