/**
 * Shared types and pure utilities for the weekly day strip.
 * No 'use client' — importable from both Server and Client Components.
 */

import type { CalendarWeek } from '@/domain/calendar/calendar.types'

export type WeekDayCell = {
  idx: number
  dateNum: number
  isToday: boolean
  sessionType: string | null
  done: boolean
  durationMin: number
  zoneTarget: string
  label: string | null
  hasGym: boolean
}

/**
 * Converts CalendarDay[] (from /api/athlete/calendar) to WeekDayCell[].
 *
 * Coexistence rules:
 *   sport (non-rest) + gym  → sport is primary, label appends "+ Gym"
 *   sport (non-rest) only   → sport is primary, no overlay
 *   DESCANSO + gym          → gym is primary (rest day means no sport, not no gym)
 *   gym only                → gym is primary (type=FUERZA)
 *   DESCANSO only           → DESCANSO
 *   neither                 → empty cell
 */
export function calendarDaysToWeekCells(
  days: CalendarWeek['days'],
  todayWeekIdx: number,
): WeekDayCell[] {
  return days.map((d) => {
    const { sport, gym, freeRun, weekIdx, dateNum } = d

    const hasSport   = !!sport && sport.type !== 'DESCANSO'
    const isRest     = !!sport && sport.type === 'DESCANSO'
    const hasGym     = !!gym
    const hasFreeRun = !!freeRun

    let sessionType: string | null = null
    let done = false
    let durationMin = 0
    let zoneTarget = ''
    let label: string | null = null
    let cellHasGym = false

    if (hasSport && hasGym) {
      sessionType = sport!.type
      done        = sport!.done
      durationMin = sport!.durationMin
      zoneTarget  = sport!.zoneTarget ?? ''
      label       = (sport!.detailText?.slice(0, 22) ?? sport!.type) + ' + Gym'
      cellHasGym  = true
    } else if (hasSport) {
      sessionType = sport!.type
      done        = sport!.done
      durationMin = sport!.durationMin
      zoneTarget  = sport!.zoneTarget ?? ''
      label       = sport!.detailText?.slice(0, 28) ?? sport!.type
    } else if (hasGym) {
      // Gym is the only session (or sport was DESCANSO → gym wins as primary)
      sessionType = 'FUERZA'
      done        = gym!.done
      durationMin = gym!.durationMin ?? 0
      label       = gym!.label
    } else if (hasFreeRun) {
      // Free run log — self-directed, no plan
      sessionType = freeRun!.type
      done        = true
      durationMin = freeRun!.durationMin ?? 0
      label       = freeRun!.distanceKm ? `${freeRun!.distanceKm} km` : null
    } else if (isRest) {
      sessionType = 'DESCANSO'
    }

    return {
      idx: weekIdx,
      dateNum,
      isToday: weekIdx === todayWeekIdx,
      sessionType,
      done,
      durationMin,
      zoneTarget,
      label,
      hasGym: cellHasGym,
    }
  })
}

export function buildWeekDayCells({
  weekDayDates,
  sessionMap,
  gymDays,
  todayWeekIdx,
}: {
  weekDayDates: Record<number, number>
  sessionMap: Record<number, { type: string; label: string; done: boolean; durationMin: number; zoneTarget: string }>
  gymDays: Set<number>
  todayWeekIdx: number
}): WeekDayCell[] {
  return Array.from({ length: 7 }, (_, idx) => {
    const s = sessionMap[idx] ?? null
    const hasGym = gymDays.has(idx)
    return {
      idx,
      dateNum: weekDayDates[idx] ?? 0,
      isToday: idx === todayWeekIdx,
      sessionType: s?.type ?? null,
      done: s?.done ?? false,
      durationMin: s?.durationMin ?? 0,
      zoneTarget: s?.zoneTarget ?? '',
      label: s && hasGym ? (s.label.slice(0, 22) + ' + Gym') : s?.label ?? null,
      hasGym,
    }
  })
}
