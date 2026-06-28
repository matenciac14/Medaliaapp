'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

interface WeekNavBarProps {
  weekLabel: string
  weekOffset: number
  canGoPrev: boolean
  canGoNext: boolean
}

export default function WeekNavBar({ weekLabel, weekOffset, canGoPrev, canGoNext }: WeekNavBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(delta: number) {
    const next = weekOffset + delta
    router.push(next === 0 ? pathname : `${pathname}?weekOffset=${next}`)
  }

  const isCurrentWeek = weekOffset === 0

  return (
    <div className="flex items-center gap-2 shrink-0">
      {!isCurrentWeek && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs font-semibold text-[#f97316] hover:text-[#ea6c0a] transition-colors px-2 py-1.5 rounded-lg hover:bg-orange-50"
        >
          Hoy
        </button>
      )}
      <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => navigate(-1)}
          disabled={!canGoPrev}
          className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={16} className="text-gray-500" />
        </button>
        <span className="px-3 text-xs font-semibold text-gray-600 whitespace-nowrap">
          {weekLabel}
        </span>
        <button
          onClick={() => navigate(1)}
          disabled={!canGoNext}
          className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
          aria-label="Semana siguiente"
        >
          <ChevronRight size={16} className="text-gray-500" />
        </button>
      </div>
    </div>
  )
}
