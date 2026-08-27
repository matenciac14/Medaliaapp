'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

type Props = {
  isB2B: boolean
  showGymBuilder?: boolean
}

export default function PlanEmptyClient({ isB2B, showGymBuilder = false }: Props) {
  const todayDow = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  }, [])

  const [selectedDow, setSelectedDow] = useState(todayDow)
  const [weekOffset, setWeekOffset] = useState(0)

  const baseMonday = useMemo(() => {
    const today = new Date()
    const dow = today.getDay() === 0 ? 7 : today.getDay()
    const mon = new Date(today)
    mon.setDate(today.getDate() - (dow - 1))
    mon.setHours(0, 0, 0, 0)
    return mon
  }, [])

  const weekMonday = new Date(baseMonday.getTime() + weekOffset * 7 * 86400000)
  const weekSunday = new Date(weekMonday.getTime() + 6 * 86400000)
  const weekRangeLabel = `${weekMonday.getDate()} ${MONTHS_SHORT[weekMonday.getMonth()]} – ${weekSunday.getDate()} ${MONTHS_SHORT[weekSunday.getMonth()]}`
  const weekNavLabel = `Semana del ${weekMonday.getDate()} – ${weekSunday.getDate()} ${MONTHS_SHORT[weekSunday.getMonth()]}`

  const selDateObj = new Date(weekMonday.getTime() + (selectedDow - 1) * 86400000)
  const selDayLabel = `${WEEK_DAYS[selectedDow - 1]} ${selDateObj.getDate()}`

  return (
    <>
    {/* ══════ MOBILE (< sm) — Figma 3427:46 / 3431:46 ══════ */}
    <div className="sm:hidden min-h-screen bg-[#f1f5f9]">
      {/* Header — navy gradient */}
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] pb-3 px-5 pt-[max(env(safe-area-inset-top,0px),20px)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-[20px] font-bold text-white leading-tight">Mi Plan</h1>
            <p className="text-[11px] text-white/60 mt-0.5">Sin plan asignado</p>
          </div>
        </div>

        {/* Week Nav */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white/10 rounded-xl h-10">
            <button
              onClick={() => { setWeekOffset(w => w - 1); setSelectedDow(1) }}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="flex-1 text-[13px] font-semibold text-white text-center whitespace-nowrap">
              {weekNavLabel}
            </span>
            {weekOffset !== 0 && (
              <button
                onClick={() => { setWeekOffset(0); setSelectedDow(todayDow) }}
                className="text-[12px] font-bold text-white bg-[#ea580c] px-3 py-1 rounded-full transition-colors hover:bg-[#d14d07]"
              >
                Hoy
              </button>
            )}
            <button
              onClick={() => { setWeekOffset(w => w + 1); setSelectedDow(1) }}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] text-white/70"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Day Pills */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between">
          {Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1
            const dateObj = new Date(weekMonday.getTime() + i * 86400000)
            const isToday = weekOffset === 0 && dow === todayDow
            const isSel = dow === selectedDow

            return (
              <button key={dow} onClick={() => setSelectedDow(dow)} className="flex flex-col items-center gap-1">
                <span className={cn('text-[11px] font-semibold',
                  isToday ? 'text-[#ea580c]' : isSel ? 'text-[#1e3a5f]' : 'text-gray-400'
                )}>
                  {WEEK_DAYS[i]}
                </span>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold transition-colors',
                  isToday ? 'bg-[#ea580c] text-white' :
                  isSel ? 'border-2 border-[#1e3a5f] text-[#1e3a5f] bg-white' :
                  'bg-white text-gray-400 border border-gray-200'
                )}>
                  {dateObj.getDate()}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 pb-24">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {selDayLabel} · Sesión del día
        </p>

        {/* Session libre card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-[20px]">📝</span>
            <h3 className="text-[18px] font-black text-gray-900 leading-tight">Sesión libre</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[12px] font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">— min</span>
            <span className="text-[12px] font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100">Zona 2–3</span>
            <span className="text-[12px] font-semibold bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100">Libre</span>
          </div>
          <p className="text-[12px] text-gray-400">Registra actividad libre — sin plan asignado</p>
          <a
            href="/log"
            className="block w-full text-center bg-[#ea580c] hover:opacity-90 text-white text-[14px] font-bold py-3 rounded-xl transition-opacity"
          >
            Registrar sesión libre →
          </a>
        </div>

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta semana</p>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Esta semana</p>
            <p className="text-[20px] font-black leading-none text-gray-900">0</p>
            <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sesiones</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Tiempo</p>
            <p className="text-[20px] font-black leading-none text-gray-900">—</p>
            <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">registrado</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Adherencia</p>
            <p className="text-[20px] font-black leading-none text-[#ea580c]">—</p>
            <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sin meta activa</p>
          </div>
        </div>

        {/* CTA card */}
        {isB2B ? (
          <div className="bg-[#1e3a5f] rounded-xl p-5 space-y-2">
            <p className="text-[14px] font-bold text-white">Tu coach está preparando tu plan</p>
            <p className="text-[11px] text-white/60">Cuando tu entrenador asigne el plan, aparecerá aquí automáticamente.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-[14px] font-bold text-[#1e3a5f]">¿Quieres entrenar con un plan?</p>
            <p className="text-[11px] text-gray-400">Un plan estructurado adapta cada sesión a tus métricas semanales.</p>
            <a
              href="/find-coach"
              className="block w-full text-center bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[14px] font-bold py-3 rounded-xl transition-colors"
            >
              Buscar entrenador →
            </a>
            {showGymBuilder && (
              <a
                href="/gym/builder"
                className="block w-full text-center border border-gray-200 text-gray-700 text-[13px] font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Construir mi rutina
              </a>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ══════ DESKTOP (sm+) ══════ */}
    <div className="hidden sm:block px-4 py-6 md:px-8 max-w-7xl mx-auto">
      {/* TopBar */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
            Mi Plan
          </h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Sin plan asignado</p>
        </div>
        <div className="flex items-center gap-2">
          {weekOffset !== 0 && (
            <button
              onClick={() => { setWeekOffset(0); setSelectedDow(todayDow) }}
              className="text-[12px] font-bold text-[#ea580c] hover:text-[#c2410c] transition-colors whitespace-nowrap"
            >
              Hoy
            </button>
          )}
          <div className="flex items-center bg-[#f1f5f9] rounded-[10px] overflow-hidden">
            <button
              onClick={() => { setWeekOffset(w => w - 1); setSelectedDow(1) }}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg mx-1 text-[14px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              ←
            </button>
            <span className="px-4 text-[13px] font-semibold text-[#1e3a5f] whitespace-nowrap">
              {weekRangeLabel}
            </span>
            <button
              onClick={() => { setWeekOffset(w => w + 1); setSelectedDow(1) }}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg mx-1 text-[14px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        <div className="grid grid-cols-7 divide-x divide-gray-50">
          {Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1
            const dateObj = new Date(weekMonday.getTime() + i * 86400000)
            const isToday = weekOffset === 0 && dow === todayDow
            const isSelected = dow === selectedDow

            const barColor = isToday || isSelected ? 'bg-[#ea580c]' : 'bg-gray-200'
            const cardBg = isToday
              ? 'bg-[#1e3a5f]'
              : isSelected ? 'bg-orange-50'
              : 'bg-[#f5f7fa] hover:bg-gray-100'
            const isInverted = isToday

            return (
              <button
                key={dow}
                onClick={() => setSelectedDow(dow)}
                className={cn('flex flex-col items-center py-3.5 px-1 transition-colors text-center relative min-h-[150px]', cardBg)}
              >
                <div className={cn('absolute top-0 left-0 right-0 h-[3px]', barColor)} />

                <span className={cn('text-[11px] font-semibold mb-1',
                  isInverted ? 'text-white/70' :
                  isToday || isSelected ? 'text-[#ea580c] font-bold' :
                  'text-gray-400'
                )}>
                  {WEEK_DAYS[i]}
                </span>

                <div className="flex items-center gap-1 mb-2">
                  <span className={cn('text-[22px] font-black leading-none',
                    isInverted ? 'text-white' :
                    isToday || isSelected ? 'text-[#ea580c]' :
                    'text-gray-300'
                  )}>
                    {dateObj.getDate()}
                  </span>
                  {isToday && (
                    <span className="text-[8px] font-bold bg-[#ea580c] text-white px-1.5 py-0.5 rounded-full leading-none">
                      HOY
                    </span>
                  )}
                </div>

                {isSelected && (
                  <>
                    <span className={cn('text-[12px] font-semibold leading-tight mt-auto',
                      isInverted ? 'text-white' : 'text-gray-700'
                    )}>
                      Sesión libre
                    </span>
                    <span className="text-[11px] font-semibold text-[#ea580c] mt-0.5">
                      Registrar →
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {selDayLabel} · Sesión del día
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-[22px]">📝</span>
              <div>
                <h3 className="text-[18px] font-black text-gray-900">
                  Registrar sesión libre — {selDayLabel}
                </h3>
                <p className="text-[12px] text-gray-400 mt-1">
                  Sin plan activo — puedes registrar cualquier actividad libremente.
                </p>
              </div>
            </div>
            <a
              href="/log"
              className="inline-flex items-center gap-2 bg-[#ea580c] hover:opacity-90 text-white text-[14px] font-bold px-5 py-3 rounded-xl transition-opacity"
            >
              Registrar sesión →
            </a>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta semana</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Esta semana</p>
              <p className="text-[20px] font-black leading-none text-gray-900">0</p>
              <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sesiones</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Tiempo</p>
              <p className="text-[20px] font-black leading-none text-gray-900">0</p>
              <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">registrado</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Adherencia</p>
              <p className="text-[20px] font-black leading-none text-[#ea580c]">0</p>
              <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sin meta activa</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {isB2B ? (
              <>
                <p className="text-[13px] font-bold text-[#1e3a5f]">Tu coach está preparando tu plan</p>
                <p className="text-[11px] text-gray-400">Cuando tu entrenador lo asigne, aparecerá aquí automáticamente.</p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-[#1e3a5f]">¿Quieres entrenar con un plan?</p>
                <p className="text-[11px] text-gray-400">Un plan estructurado adapta cada sesión a tus métricas semanales.</p>
                <a
                  href="/find-coach"
                  className="block w-full text-center bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[14px] font-bold px-5 py-3 rounded-xl transition-colors"
                >
                  Buscar entrenador →
                </a>
                {showGymBuilder && (
                  <a
                    href="/gym/builder"
                    className="block w-full text-center border border-gray-200 text-gray-700 text-[13px] font-medium px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Construir mi rutina
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
