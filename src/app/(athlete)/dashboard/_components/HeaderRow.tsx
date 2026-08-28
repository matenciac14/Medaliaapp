import Link from 'next/link'
import WeekNavBar from '../../_components/WeekNavBar'
import { getGreeting, formatDate } from '../_lib/dashboard-helpers'

type HeaderRowProps = {
  firstName: string
  timezone: string
  weekLabel: string
  weekOffset: number
  canGoPrev: boolean
  canGoNext: boolean
  streakDays: number
}

export function MobileHeader({ firstName, timezone, weekLabel, weekOffset, canGoPrev, canGoNext, streakDays }: HeaderRowProps) {
  return (
    <div className="sm:hidden bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-5 pt-[max(env(safe-area-inset-top,0px),40px)] pb-1.5">
      {/* TopGroup */}
      <div className="space-y-1">
        {/* GreetingRow: greeting + icons */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[22px] font-black text-white tracking-tight leading-tight flex-1 truncate">
            {getGreeting(timezone)}!
          </h1>
          <div className="flex items-center gap-2.5 shrink-0">
            {streakDays >= 2 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] border border-[#ea580c]/50 text-[13px]">
                <span className="text-[11px]">🔥</span>
                <span className="font-bold text-[#ea580c]">{streakDays}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] border border-white/20 text-[13px]">
                <span className="text-[11px] opacity-50 grayscale">🔥</span>
                <span className="font-bold text-white/30">{streakDays}</span>
              </span>
            )}
            <Link href="/notifications" className="relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            </Link>
          </div>
        </div>
        {/* UserName */}
        <p className="text-[16px] font-semibold text-white/80">{firstName}</p>
      </div>
      {/* DateLabel — centered */}
      <p className="text-[11px] text-[#999] text-center mt-1.5">{formatDate()}</p>
      {/* WeekNav */}
      <div className="mt-1.5">
        <WeekNavBar
          weekLabel={weekLabel}
          weekOffset={weekOffset}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          variant="dark"
        />
      </div>
    </div>
  )
}

export function DesktopHeader({ firstName, timezone, streakDays }: { firstName: string; timezone: string; streakDays: number }) {
  return (
    <div className="hidden sm:flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {getGreeting(timezone)}, {firstName}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{formatDate()}</p>
      </div>
      {streakDays >= 2 && (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-[11px] font-semibold text-[#ea580c] mt-1">
          🔥 {streakDays} días · racha activa
        </span>
      )}
    </div>
  )
}
