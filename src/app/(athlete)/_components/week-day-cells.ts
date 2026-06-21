/**
 * Shared types and pure utilities for the weekly day strip.
 * No 'use client' — importable from both Server and Client Components.
 */

export type WeekDayCell = {
  idx: number
  dateNum: number
  isToday: boolean
  sessionType: string | null
  done: boolean
  durationMin: number
  zoneTarget: string
  label: string | null
  gymOverlay: string | null
}

export function buildWeekDayCells({
  weekDayDates,
  sessionMap,
  gymOverlayMap,
  todayWeekIdx,
}: {
  weekDayDates: Record<number, number>
  sessionMap: Record<number, { type: string; label: string; done: boolean; durationMin: number; zoneTarget: string }>
  gymOverlayMap: Record<number, string>
  todayWeekIdx: number
}): WeekDayCell[] {
  return Array.from({ length: 7 }, (_, idx) => {
    const s = sessionMap[idx] ?? null
    return {
      idx,
      dateNum: weekDayDates[idx] ?? 0,
      isToday: idx === todayWeekIdx,
      sessionType: s?.type ?? null,
      done: s?.done ?? false,
      durationMin: s?.durationMin ?? 0,
      zoneTarget: s?.zoneTarget ?? '',
      label: s?.label ?? null,
      gymOverlay: gymOverlayMap[idx] ?? null,
    }
  })
}
