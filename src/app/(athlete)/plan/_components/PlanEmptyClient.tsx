'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageTopBar from '../../_components/PageTopBar'
import WeekNavBar from '../../_components/WeekNavBar'

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

type NutritionTarget = { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string }

type Props = {
  isB2B: boolean
  nutritionTarget: NutritionTarget | null
}

export default function PlanEmptyClient({ isB2B, nutritionTarget }: Props) {
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
            <h1 className="text-[22px] font-bold text-white leading-tight">Mi Plan</h1>
            <p className="text-[12px] text-[#99a6b8] mt-0.5">Sin plan asignado</p>
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
        <p className="text-[10px] font-semibold text-[#9ba2ad] uppercase tracking-[0.3px]">
          {selDayLabel} · Sesión del día
        </p>

        {/* SessionCard — Figma 3427:84 */}
        <SessionCard />

        <p className="text-[10px] font-semibold text-[#9ba2ad] uppercase tracking-[0.3px]">Esta semana</p>

        {/* KPIs — Figma 3427:117-128 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-200 p-2.5">
            <p className="text-[10px] font-medium text-[#9ba2ad] mb-1">Esta semana</p>
            <p className="text-[18px] font-bold leading-none text-gray-900">0</p>
            <p className="text-[9px] text-[#bcc0c7] mt-1.5">sesiones</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-2.5">
            <p className="text-[10px] font-medium text-[#9ba2ad] mb-1">Tiempo</p>
            <p className="text-[18px] font-bold leading-none text-gray-900">—</p>
            <p className="text-[9px] text-[#bcc0c7] mt-1.5">registrado</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-2.5">
            <p className="text-[10px] font-medium text-[#9ba2ad] mb-1">Adherencia</p>
            <p className="text-[18px] font-bold leading-none text-[#f97316]">—</p>
            <p className="text-[9px] text-[#bcc0c7] mt-1.5">sin meta activa</p>
          </div>
        </div>

        {/* Progreso del plan — Figma 6066:190 */}
        <PhaseProgressEmpty />

        {/* Adherencia semanal — Figma 6066:204 */}
        <AdherenceEmpty />

        {/* KcalHeroCard — Figma 6066:230 */}
        <KcalHeroCard nutritionTarget={nutritionTarget} />

        {/* Composición corporal — Figma 6066:262 */}
        <BodyCompositionEmpty />

        {/* CTA — Figma 3430:46 */}
        {isB2B ? (
          <div className="bg-[#1e3a5f] rounded-xl p-5 space-y-2">
            <p className="text-[14px] font-bold text-white">Tu coach está preparando tu plan</p>
            <p className="text-[11px] text-white/60">Cuando tu entrenador asigne el plan, aparecerá aquí automáticamente.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#d1d9e1] p-4 space-y-2.5">
            <p className="text-[13px] font-semibold text-[#1c2b45]">¿Quieres entrenar con un plan?</p>
            <p className="text-[11px] text-[#708299] leading-[15px]">Un plan estructurado adapta cada sesión a tus métricas semanales.</p>
            <a
              href="/find-coach"
              className="flex items-center justify-center w-full bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[13px] font-semibold py-[11px] rounded-[10px] transition-colors"
            >
              Buscar entrenador →
            </a>
          </div>
        )}
      </div>
    </div>

    {/* ══════ DESKTOP (sm+) ══════ */}
    <div className="hidden sm:block px-4 py-6 md:px-8 max-w-7xl mx-auto">
      <PageTopBar
        title="Mi Plan"
        subtitle="Sin plan asignado"
        right={
          <WeekNavBar
            weekLabel={weekRangeLabel}
            canGoPrev={true}
            canGoNext={true}
            onPrev={() => { setWeekOffset(w => w - 1); setSelectedDow(1) }}
            onNext={() => { setWeekOffset(w => w + 1); setSelectedDow(1) }}
            onToday={() => { setWeekOffset(0); setSelectedDow(todayDow) }}
            showToday={weekOffset !== 0}
          />
        }
      />
      <div className="h-6" />

      {/* Calendar Strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        <div className="grid grid-cols-7 divide-x divide-gray-50">
          {Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1
            const dateObj = new Date(weekMonday.getTime() + i * 86400000)
            const isToday = weekOffset === 0 && dow === todayDow
            const isSelected = dow === selectedDow
            const isFuture = weekOffset === 0 ? dow > todayDow : weekOffset > 0

            const barColor = isToday || isSelected ? 'bg-[#ea580c]' : isFuture ? 'bg-[#ea580c]/30' : 'bg-gray-200'
            const cardBg = isToday
              ? 'bg-[#1e3a5f]'
              : isSelected ? 'bg-orange-50'
              : isFuture ? 'bg-[#fff7ed] hover:bg-orange-100'
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
                  isFuture ? 'text-[#ea580c]' : 'text-gray-400'
                )}>
                  {WEEK_DAYS[i]}
                </span>
                <div className="flex items-center gap-1 mb-2">
                  <span className={cn('text-[22px] font-black leading-none',
                    isInverted ? 'text-white' :
                    isToday || isSelected ? 'text-[#ea580c]' :
                    isFuture ? 'text-[#ea580c]' : 'text-gray-300'
                  )}>
                    {dateObj.getDate()}
                  </span>
                  {isToday && (
                    <span className="text-[8px] font-bold bg-[#ea580c] text-white px-1.5 py-0.5 rounded-full leading-none">HOY</span>
                  )}
                </div>
                {isSelected && (
                  <>
                    <span className={cn('text-[12px] font-semibold leading-tight mt-auto', isInverted ? 'text-white' : 'text-gray-700')}>
                      Sesión libre
                    </span>
                    <span className="text-[11px] font-semibold text-[#ea580c] mt-0.5">Registrar →</span>
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
          <p className="text-[10px] font-semibold text-[#9ba2ad] uppercase tracking-[0.3px]">
            {selDayLabel} · Sesión del día
          </p>
          {/* Desktop SessionCard */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e5eaf0] rounded-sm" />
            <div className="p-6 pl-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[22px]">📝</span>
                <h3 className="text-[18px] font-bold text-[#1c2b45]">Sesión libre</h3>
              </div>
              <div className="flex gap-1.5">
                <span className="bg-[#f0f1f4] text-[#6b7582] text-[11px] font-semibold px-2 py-[5px] rounded-[6px]">— min</span>
                <span className="bg-[#f0f1f4] text-[#6b7582] text-[11px] font-semibold px-2 py-[5px] rounded-[6px]">Zona 2–3</span>
                <span className="bg-[#fff1ea] text-[#f97316] text-[11px] font-bold px-2 py-[5px] rounded-[6px]">Libre</span>
              </div>
              <p className="text-[10px] font-bold text-[#8c9eb2] tracking-[0.6px]">Registra actividad libre — sin plan asignado</p>
              <a
                href="/log"
                className="flex items-center justify-center w-full bg-[#ea580c] hover:opacity-90 text-white text-[14px] font-bold h-[42px] rounded-[10px] transition-opacity"
              >
                Registrar sesión libre →
              </a>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <p className="text-[10px] font-semibold text-[#9ba2ad] uppercase tracking-[0.3px]">Esta semana</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-gray-200 p-2.5">
              <p className="text-[10px] font-medium text-[#9ba2ad] mb-1">Esta semana</p>
              <p className="text-[18px] font-bold leading-none text-gray-900">0</p>
              <p className="text-[9px] text-[#bcc0c7] mt-1.5">sesiones</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-2.5">
              <p className="text-[10px] font-medium text-[#9ba2ad] mb-1">Tiempo</p>
              <p className="text-[18px] font-bold leading-none text-gray-900">0</p>
              <p className="text-[9px] text-[#bcc0c7] mt-1.5">registrado</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-2.5">
              <p className="text-[10px] font-medium text-[#9ba2ad] mb-1">Adherencia</p>
              <p className="text-[18px] font-bold leading-none text-[#f97316]">0</p>
              <p className="text-[9px] text-[#bcc0c7] mt-1.5">sin meta activa</p>
            </div>
          </div>
          <PhaseProgressEmpty />
          <AdherenceEmpty />
          <KcalHeroCard nutritionTarget={nutritionTarget} />
          <BodyCompositionEmpty />
          <div className="bg-white rounded-2xl border border-[#d1d9e1] p-4 space-y-2.5">
            {isB2B ? (
              <>
                <p className="text-[13px] font-semibold text-[#1c2b45]">Tu coach está preparando tu plan</p>
                <p className="text-[11px] text-[#708299] leading-[15px]">Cuando tu entrenador lo asigne, aparecerá aquí automáticamente.</p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-[#1c2b45]">¿Quieres entrenar con un plan?</p>
                <p className="text-[11px] text-[#708299] leading-[15px]">Un plan estructurado adapta cada sesión a tus métricas semanales.</p>
                <a
                  href="/find-coach"
                  className="flex items-center justify-center w-full bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[13px] font-semibold py-[11px] rounded-[10px] transition-colors"
                >
                  Buscar entrenador →
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

// ── SessionCard — Figma 3427:84 ─────────────────────────────────────

function SessionCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden relative">
      {/* Left border accent — Figma: 4px wide #e5eaf0 */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e5eaf0] rounded-sm" />
      <div className="p-4 pl-4 space-y-3">
        {/* Title row — Figma: emoji 22px + title 18px bold #1c2b45 */}
        <div className="flex items-center gap-2">
          <span className="text-[22px]">📝</span>
          <h3 className="text-[18px] font-bold text-[#1c2b45]">Sesión libre</h3>
        </div>
        {/* Badges — Figma: rounded-[6px], gap-[6px] */}
        <div className="flex gap-1.5">
          <span className="bg-[#f0f1f4] text-[#6b7582] text-[11px] font-semibold px-2 py-[5px] rounded-[6px]">— min</span>
          <span className="bg-[#f0f1f4] text-[#6b7582] text-[11px] font-semibold px-2 py-[5px] rounded-[6px]">Zona 2–3</span>
          <span className="bg-[#fff1ea] text-[#f97316] text-[11px] font-bold px-2 py-[5px] rounded-[6px]">Libre</span>
        </div>
        {/* Subtitle — Figma: 10px bold #8c9eb2, tracking 0.6px */}
        <p className="text-[10px] font-bold text-[#8c9eb2] tracking-[0.6px]">
          Registra actividad libre — sin plan asignado
        </p>
        {/* Spacer to match Figma's ~90px gap between subtitle and CTA */}
        <div className="h-14" />
        {/* CTA — Figma: bg-[#ea5809], h-[42px], rounded-[10px], full width */}
        <a
          href="/log"
          className="flex items-center justify-center w-full bg-[#ea580c] hover:opacity-90 text-white text-[14px] font-bold h-[42px] rounded-[10px] transition-opacity"
        >
          Registrar sesión libre →
        </a>
      </div>
    </div>
  )
}

// ── PhaseProgress — Figma 6066:190 ──────────────────────────────────

const PHASE_LABELS_EMPTY = ['BASE', 'DESARR.', 'ESPEC.', 'AFIN.']

function PhaseProgressEmpty() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2">
      <p className="text-[12px] font-semibold text-gray-900">Sin plan activo</p>
      <div className="flex gap-[3px]">
        {PHASE_LABELS_EMPTY.map(p => (
          <div
            key={p}
            className="flex-1 h-8 rounded-[6px] bg-[#e5e7eb] flex items-center justify-center"
          >
            <span className="text-[9px] font-semibold text-[#9ca3af] tracking-[0.4px]">{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Adherence — Figma 6066:204 ──────────────────────────────────────

const EMPTY_DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function AdherenceEmpty() {
  return (
    <div className="bg-[#f7fafc] rounded-lg border border-[#e5ebf0] px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-[#4d5966]">Adherencia semanal</span>
        <span className="text-[11px] font-semibold text-[#808c99]">Sin datos</span>
      </div>
      <div className="flex gap-1.5">
        {EMPTY_DAY_LABELS.map(d => (
          <div key={d} className="flex-1 flex flex-col items-center gap-[3px]">
            <div className="w-full h-[22px] rounded bg-[#e5e7eb]" />
            <span className="text-[9px] font-medium text-[#808c99]">{d}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── KcalHeroCard — Figma 6066:230 ───────────────────────────────────

const RING_SIZE = 120
const STROKE_WIDTH = 10
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const MINI_RING_SIZE = 40
const MINI_STROKE = 4
const MINI_RADIUS = (MINI_RING_SIZE - MINI_STROKE) / 2

function KcalHeroCard({ nutritionTarget: nt }: { nutritionTarget: NutritionTarget | null }) {
  const hasData = nt !== null
  const kcalDisplay = hasData ? nt.kcal.toLocaleString('es') : '—'
  const protDisplay = hasData ? `${nt.proteinG}g` : '0g'
  const carbsDisplay = hasData ? `${nt.carbsG}g` : '0g'
  const fatDisplay = hasData ? `${nt.fatG}g` : '0g'

  return (
    <a href="/nutrition" className="block bg-white rounded-[20px] border border-[#f0f2f5] hover:shadow-md transition-shadow">
      <div className="flex items-center gap-5 p-5 h-[180px]">
        {/* Donut ring — Figma: 120x120 */}
        <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0">
            <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke="#f3f4f6" strokeWidth={STROKE_WIDTH} fill="none" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-bold leading-none text-[#b3b3b3]">0</span>
            <span className="text-[10px] font-medium text-[#8c99a6] mt-0.5">kcal</span>
          </div>
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          <div>
            <p className="text-[9px] font-bold text-[#8c99a6] uppercase tracking-[0.72px]">Objetivo diario</p>
            <div className="flex items-end gap-1 mt-0.5">
              <span className="text-[24px] font-bold text-[#1f3b5e] leading-none">{kcalDisplay}</span>
              <span className="text-[11px] text-[#8c99a6] pb-0.5">kcal objetivo</span>
            </div>
            <p className="text-[10px] font-medium text-[#999] mt-0.5">Sin registros hoy</p>
          </div>

          {/* Mini macro rings — Figma: 40x40 each */}
          <div className="flex gap-3">
            {[
              { label: 'Prot', value: protDisplay, color: '#3b82f6' },
              { label: 'Carbs', value: carbsDisplay, color: '#eab308' },
              { label: 'Grasas', value: fatDisplay, color: '#22c55e' },
            ].map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <svg width={MINI_RING_SIZE} height={MINI_RING_SIZE}>
                  <circle cx={MINI_RING_SIZE / 2} cy={MINI_RING_SIZE / 2} r={MINI_RADIUS} stroke="#f3f4f6" strokeWidth={MINI_STROKE} fill="none" />
                </svg>
                <span className="text-[11px] font-bold text-[#b3b3b3]">{m.value}</span>
                <span className="text-[9px] font-medium text-[#8c99a6]">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </a>
  )
}

// ── BodyComposition — Figma 6066:262 ────────────────────────────────

function BodyCompositionEmpty() {
  return (
    <div className="bg-white rounded-xl border border-[#e5ebf0] px-5 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-semibold text-[#33404d]">Composición corporal</span>
        <span className="bg-black/5 text-[#9ca3af] text-[10px] font-semibold px-2 py-[3px] rounded-[10px]">Sin datos</span>
      </div>
      <div className="flex items-start">
        {/* Weight */}
        <div className="w-[82px]">
          <p className="text-[22px] font-bold text-[#1a2744]">— kg</p>
          <p className="text-[10px] text-[#808c99]">sin registro</p>
        </div>
        {/* Divider */}
        <div className="w-px h-9 bg-[#e0e5eb] mx-3 mt-1" />
        {/* Measures */}
        <div className="flex flex-1 gap-0">
          {['Cintura', 'Cadera', 'Muslo'].map(label => (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[13px] font-semibold text-[#33404d]">— cm</span>
              <span className="text-[9px] text-[#808c99]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
