'use client'

import { useState, useEffect } from 'react'
import type { CalendarWeek } from '@/domain/calendar/calendar.types'
import { calendarDaysToWeekCells, type WeekDayCell } from './week-day-cells'
import WeekDayStrip from './WeekDayStrip'
import { jsToWeekIdx } from '@/lib/core/date-utils'

interface Props {
  weekOffset: number
  /** Whether to show the completion progress bar above the strip */
  showProgressBar?: boolean
}

export default function DashboardCalendarStrip({ weekOffset, showProgressBar = false }: Props) {
  const todayWeekIdx = jsToWeekIdx(new Date().getDay())
  const isCurrentWeek = weekOffset === 0

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
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ completed: 0, total: 0 })

  useEffect(() => {
    setLoading(true)
    fetch(`/api/athlete/calendar?weekOffset=${weekOffset}`)
      .then(r => r.json())
      .then((week: CalendarWeek) => {
        const todayIdx = isCurrentWeek ? todayWeekIdx : -1
        const nextCells = calendarDaysToWeekCells(week.days, todayIdx)
        setCells(nextCells)

        // Compute completion stats for the progress bar
        const training = nextCells.filter(c => c.sessionType && c.sessionType !== 'DESCANSO')
        setStats({
          completed: training.filter(c => c.done).length,
          total: training.length,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weekOffset])

  const progressPct = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {showProgressBar && stats.total > 0 && (
        <div className="h-1 bg-gray-100 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-[#22c55e] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
      <WeekDayStrip cells={cells} variant="cards" />
    </div>
  )
}
