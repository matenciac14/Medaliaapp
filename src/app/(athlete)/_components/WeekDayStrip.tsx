'use client'

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WEEK_DAYS_SHORT, SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import type { WeekDayCell } from './week-day-cells'

export type { WeekDayCell }

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  cells: WeekDayCell[]
  /** Index of the selected day (0-6). Activates selection state. */
  selectedIdx?: number
  /** Called when a cell is clicked. */
  onCellClick?: (idx: number) => void
  /** 'cards' = dashboard tall-card style; 'grid' = plan/gym compact 7-col grid */
  variant?: 'cards' | 'grid'
  className?: string
}

export default function WeekDayStrip({ cells, selectedIdx, onCellClick, variant = 'grid', className }: Props) {
  if (variant === 'cards') {
    return (
      <div className={cn('flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-7 sm:overflow-visible', className)}>
        {cells.map(cell => (
          <DashboardCard
            key={cell.idx}
            cell={cell}
            onClick={onCellClick ? () => onCellClick(cell.idx) : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-7 divide-x divide-gray-50', className)}>
      {cells.map(cell => (
        <GridCell
          key={cell.idx}
          cell={cell}
          isSelected={selectedIdx === cell.idx}
          onClick={onCellClick ? () => onCellClick(cell.idx) : undefined}
        />
      ))}
    </div>
  )
}

// ── Dashboard card variant ─────────────────────────────────────────────────────

function DashboardCard({ cell, onClick }: { cell: WeekDayCell; onClick?: () => void }) {
  const { isToday, done, sessionType, label, durationMin, zoneTarget, gymOverlay, gymOverlayDone } = cell
  const isRest = sessionType === 'DESCANSO'
  const hasSession = !!sessionType && !isRest
  const emoji = SESSION_ICONS[sessionType ?? ''] ?? (isRest ? '😴' : null)
  const sessionName = SESSION_NAMES[sessionType ?? ''] ?? label

  const cardBg = !sessionType
    ? isToday ? 'bg-gray-100 border border-gray-200' : 'bg-gray-50'
    : done ? 'bg-[#22c55e]'
    : isToday ? 'bg-[#1e3a5f]'
    : hasSession ? 'bg-white border border-gray-200'
    : 'bg-gray-50'

  const dayColor = !sessionType
    ? isToday ? 'text-gray-500' : 'text-gray-300'
    : done || isToday ? 'text-white/80' : 'text-gray-400'

  const numColor = !sessionType
    ? 'text-gray-300'
    : done || isToday ? 'text-white' : 'text-gray-900'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={cn('rounded-2xl flex-shrink-0 w-[104px] sm:w-auto p-3 flex flex-col gap-1 min-h-[120px]', cardBg, onClick && 'cursor-pointer')}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={cn('text-[11px] font-semibold leading-none', dayColor)}>
          {WEEK_DAYS_SHORT[cell.idx]}
        </span>
        {done && <span className="text-white text-xs leading-none">✓</span>}
        {isToday && sessionType && !done && (
          <span className="text-[8px] font-bold bg-[#f97316] text-white px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">HOY</span>
        )}
        {isToday && !sessionType && (
          <span className="text-[8px] font-bold bg-gray-400 text-white px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">HOY</span>
        )}
      </div>
      <span className={cn('text-[22px] font-black leading-none mt-0.5', numColor)}>{cell.dateNum}</span>
      {emoji && <span className="text-xl leading-none mt-1">{emoji}</span>}
      {sessionName && (
        <span className={cn('text-[11px] font-semibold leading-tight mt-0.5',
          done || isToday ? 'text-white' : isRest ? 'text-gray-400' : 'text-gray-700'
        )}>
          {sessionName}
        </span>
      )}
      {hasSession && durationMin > 0 && (
        <span className={cn('text-[10px] leading-none', done || isToday ? 'text-white/70' : 'text-gray-400')}>
          {durationMin} min{zoneTarget ? ` · ${zoneTarget}` : ''}
        </span>
      )}
      {gymOverlay && (
        <span className={cn(
          'inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none mt-0.5 w-fit',
          gymOverlayDone
            ? 'text-white bg-green-500 border border-green-400'
            : 'text-purple-600 bg-purple-50 border border-purple-100',
        )}>
          {gymOverlayDone ? '✓' : '💪'} {gymOverlay}
        </span>
      )}
    </Wrapper>
  )
}

// ── Plan / Gym grid cell variant ───────────────────────────────────────────────

function GridCell({ cell, isSelected, onClick }: { cell: WeekDayCell; isSelected: boolean; onClick?: () => void }) {
  const { isToday, done, sessionType } = cell
  const isRest = sessionType === 'DESCANSO'
  const hasSession = !!sessionType && !isRest
  const sessionName = SESSION_NAMES[sessionType ?? ''] ?? cell.label
  const emoji = SESSION_ICONS[sessionType ?? ''] ?? (isRest ? '😴' : null)

  const cardBg = isSelected
    ? 'bg-[#1e3a5f] hover:bg-[#243f6a]'
    : done ? 'bg-green-50/60 hover:bg-gray-100'
    : isToday ? 'bg-orange-50 hover:bg-orange-100'
    : 'bg-white hover:bg-gray-50'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={cn('relative flex flex-col items-center py-4 px-1 text-center transition-colors', cardBg, onClick && 'cursor-pointer')}
    >
      {isToday && !isSelected && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#f97316]" />}

      <span className={cn('text-[10px] font-semibold mb-1',
        isSelected ? 'text-blue-200' :
        isToday ? 'text-[#f97316] font-bold' : 'text-gray-400'
      )}>
        {WEEK_DAYS_SHORT[cell.idx]}
      </span>

      <div className="flex items-center gap-0.5 mb-1.5">
        <span className={cn('text-xl font-black leading-none',
          isSelected ? 'text-white' :
          isToday ? 'text-[#f97316]' :
          isRest ? 'text-gray-300' :
          done ? 'text-green-600' : 'text-gray-800'
        )}>
          {cell.dateNum}
        </span>
        {isToday && !isSelected && (
          <span className="text-[8px] font-bold bg-[#f97316] text-white px-1 py-0.5 rounded-full leading-none ml-0.5">HOY</span>
        )}
      </div>

      <span className="text-base mb-1">
        {done && !isRest
          ? <CheckCircle2 size={18} className={cn('mx-auto', isSelected ? 'text-white' : 'text-green-500')} />
          : emoji ?? '—'}
      </span>

      <span className={cn('text-[10px] font-semibold leading-tight px-0.5',
        isSelected ? 'text-white/80' :
        isToday ? 'text-gray-700' :
        isRest ? 'text-gray-400' : 'text-gray-700'
      )}>
        {isRest ? 'Descanso' : (sessionName ?? '—')}
      </span>

      {hasSession && cell.durationMin > 0 && (
        <span className={cn('text-[9px] mt-0.5',
          isSelected ? 'text-blue-200' : 'text-gray-400'
        )}>
          {cell.durationMin}m{cell.zoneTarget ? ` · ${cell.zoneTarget}` : ''}
        </span>
      )}
    </Wrapper>
  )
}
