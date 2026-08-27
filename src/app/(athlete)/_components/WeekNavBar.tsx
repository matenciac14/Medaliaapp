'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekNavBarProps {
  weekLabel: string
  weekOffset: number
  canGoPrev: boolean
  canGoNext: boolean
  /** 'light' = white bg (default), 'dark' = navy bg for gradient headers */
  variant?: 'light' | 'dark'
}

export default function WeekNavBar({
  weekLabel,
  weekOffset,
  canGoPrev,
  canGoNext,
  variant = 'light',
}: WeekNavBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(delta: number) {
    const next = weekOffset + delta
    router.push(next === 0 ? pathname : `${pathname}?weekOffset=${next}`)
  }

  const isCurrentWeek = weekOffset === 0
  const isDark = variant === 'dark'

  return (
    <div className="flex items-center gap-2">
      <div
        className={
          isDark
            ? 'inline-flex items-center rounded-xl bg-white/10 w-full h-10'
            : 'inline-flex items-center border border-[rgba(30,58,95,0.15)] rounded-xl bg-white h-10'
        }
      >
        <button
          onClick={() => navigate(-1)}
          disabled={!canGoPrev}
          className={
            isDark
              ? 'w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70 disabled:opacity-30 transition-colors'
              : 'w-9 h-9 flex items-center justify-center rounded-[10px] bg-[rgba(30,58,95,0.06)] text-[#1e3a5f] disabled:opacity-30 hover:bg-[rgba(30,58,95,0.12)] transition-colors ml-0.5'
          }
          aria-label="Semana anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span
          className={
            isDark
              ? 'flex-1 text-[13px] font-semibold text-white whitespace-nowrap text-center'
              : 'flex-1 text-[13px] font-semibold text-[#1e3a5f] whitespace-nowrap text-center px-4'
          }
        >
          {weekLabel}
        </span>
        {!isCurrentWeek && isDark && (
          <button
            onClick={() => router.push(pathname)}
            className="text-[12px] font-bold text-white bg-[#ea580c] px-3 py-1 rounded-full transition-colors hover:bg-[#d14d07]"
          >
            Hoy
          </button>
        )}
        <button
          onClick={() => navigate(1)}
          disabled={!canGoNext}
          className={
            isDark
              ? 'w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70 disabled:opacity-30 transition-colors'
              : 'w-9 h-9 flex items-center justify-center rounded-[10px] bg-[rgba(30,58,95,0.06)] text-[#1e3a5f] disabled:opacity-30 hover:bg-[rgba(30,58,95,0.12)] transition-colors mr-0.5'
          }
          aria-label="Semana siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {!isCurrentWeek && !isDark && (
        <button
          onClick={() => router.push(pathname)}
          className="text-[12px] font-bold text-[#ea580c] border border-[#ea580c]/30 px-3 py-1 rounded-full transition-colors hover:bg-orange-50 whitespace-nowrap"
        >
          Hoy
        </button>
      )}
    </div>
  )
}
