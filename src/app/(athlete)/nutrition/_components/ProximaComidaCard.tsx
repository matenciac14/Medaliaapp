'use client'

import { useEffect, useState } from 'react'

type Props = {
  mealLabel: string
  scheduledTime: string // "12:30" 24h format
  foods: string
  kcal: number
  proteinG: number
}

export default function ProximaComidaCard({ mealLabel, scheduledTime, foods, kcal, proteinG }: Props) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    function calc() {
      const now = new Date()
      const [h, m] = scheduledTime.split(':').map(Number)
      const target = new Date(now)
      target.setHours(h, m, 0, 0)
      const diff = target.getTime() - now.getTime()
      if (diff <= 0) { setCountdown('Ahora'); return }
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      setCountdown(hours > 0 ? `En ${hours}h ${mins} min` : `En ${mins} min`)
    }
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [scheduledTime])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
      <div className="flex items-center gap-2 text-gray-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span className="text-xs font-bold">
          {countdown} — {scheduledTime.replace(/^(\d+):(\d+)$/, (_, hh, mm) => {
            const h = parseInt(hh)
            return `${h > 12 ? h - 12 : h}:${mm} ${h >= 12 ? 'pm' : 'am'}`
          })}
        </span>
      </div>
      <p className="text-base font-bold text-[#1e3a5f]">{mealLabel}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{foods}</p>
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-[#ea580c]">{kcal} kcal</span>
        <span className="text-xs font-bold text-blue-500">{proteinG}g prot</span>
      </div>
    </div>
  )
}
