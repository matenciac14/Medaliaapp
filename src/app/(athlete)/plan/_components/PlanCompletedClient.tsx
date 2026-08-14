'use client'

import { cn } from '@/lib/utils'
import PlanCompletionCard from '../../_components/PlanCompletionCard'

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const SESSION_EMOJI: Record<string, string> = {
  RODAJE_Z2: '🏃', EASY_RUN: '🏃', TEMPO: '🏃', FARTLEK: '🏃',
  TIRADA_LARGA: '🏃', INTERVALOS: '🏃', SIMULACRO: '🏃',
  STRENGTH: '💪', GYM: '💪', FUERZA: '💪',
  DESCANSO: '😴', REST: '😴',
  TEST: '🎯',
}

const PHASE_LABELS: Record<string, string> = {
  BASE: 'BASE', DEVELOPMENT: 'DESARRO', BUILD: 'DESARRO',
  SPECIFIC: 'ESPECÍF', PEAK: 'ESPECÍF', TAPER: 'AFIN.', RACE: 'AFIN.',
}

type LastWeekSession = {
  dayOfWeek: number
  type: string
  label: string
  durationMin: number
  zone: string
  done: boolean
}

type Props = {
  isB2B: boolean
  planName: string
  totalWeeks: number
  sessionsLogged: number
  sessionsTotal: number
  recoveryDaysSinceEnd: number
  completedAdherencePct: number
  lastWeekSessions: LastWeekSession[]
  phases: string[]
  currentWeek: number
}

export default function PlanCompletedClient({
  isB2B, planName, totalWeeks, sessionsLogged, sessionsTotal,
  recoveryDaysSinceEnd, completedAdherencePct, lastWeekSessions,
  phases, currentWeek,
}: Props) {
  const sessionsByDow = new Map(lastWeekSessions.map(s => [s.dayOfWeek, s]))

  const displayPhases = phases.length > 0
    ? [...new Set(phases.map(p => PHASE_LABELS[p] ?? p))]
    : ['BASE', 'DESARRO', 'ESPECÍF', 'AFIN.']

  return (
    <>
    {/* ══════ MOBILE (< sm) — Figma 3431:200 / 3432:64 ══════ */}
    <div className="sm:hidden min-h-screen bg-[#f1f5f9]">
      {/* Header — navy gradient */}
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] pb-3 px-5 pt-[max(env(safe-area-inset-top,0px),20px)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-[20px] font-bold text-white leading-tight">Mi Plan</h1>
            <p className="text-[11px] text-white/60 mt-0.5">{planName} · {totalWeeks} semanas</p>
          </div>
          <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">
            ✓ COMPLETADO
          </div>
        </div>

        {/* Completion date bar */}
        <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
          <span className="text-[13px] font-semibold text-white">Completado el {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Day Pills — all green */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between">
          {Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1
            const session = sessionsByDow.get(dow)
            const isDone = session?.done ?? false
            const isRest = session?.type === 'DESCANSO' || session?.type === 'REST'

            return (
              <div key={dow} className="flex flex-col items-center gap-1">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold',
                  isDone && !isRest ? 'bg-[#22c55e] text-white' :
                  isRest ? 'bg-gray-200 text-gray-400' :
                  'bg-[#22c55e] text-white'
                )}>
                  {i + 14}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 pb-24">
        {/* Celebration card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
          <span className="text-[48px] block">🏆</span>
          <h2 className="text-[22px] font-black text-gray-900">¡Plan completado!</h2>
          <p className="text-[13px] text-gray-500">{planName} · {totalWeeks} semanas</p>
          <div className="flex justify-center gap-8 pt-2">
            <div className="text-center">
              <p className="text-[24px] font-black text-gray-900">{totalWeeks}</p>
              <p className="text-[11px] text-gray-400">semanas</p>
            </div>
            <div className="text-center">
              <p className="text-[24px] font-black text-gray-900">{sessionsLogged}</p>
              <p className="text-[11px] text-gray-400">sesiones</p>
            </div>
            <div className="text-center">
              <p className="text-[24px] font-black text-[#ea580c]">{completedAdherencePct}%</p>
              <p className="text-[11px] text-gray-400">adherencia</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta semana</p>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Completadas</p>
            <p className="text-[20px] font-black leading-none text-gray-900">{sessionsLogged}/{sessionsTotal}</p>
            <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sesiones</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Volumen</p>
            <p className="text-[20px] font-black leading-none text-gray-900">{totalWeeks * 4}</p>
            <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">en el plan</p>
          </div>
          <div className={cn('bg-white rounded-xl shadow-sm p-3', completedAdherencePct < 80 ? 'border-2 border-[#ea580c]/30' : 'border border-gray-100')}>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Adherencia</p>
            <p className="text-[20px] font-black leading-none text-[#ea580c]">{completedAdherencePct}%</p>
            <p className={cn('text-[10px] mt-1 whitespace-nowrap', completedAdherencePct < 80 ? 'text-red-500' : 'text-gray-400')}>
              {completedAdherencePct < 80 ? '↓ meta 80%' : '✓ objetivo'}
            </p>
          </div>
        </div>

        {/* CTA card */}
        {isB2B ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
            <p className="text-[14px] font-bold text-[#1e3a5f]">Tu coach asignará el próximo plan</p>
            <p className="text-[11px] text-gray-400">Recibirás una notificación cuando tu entrenador lo haya preparado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-[14px] font-bold text-[#1e3a5f]">¿Listo para el siguiente desafío?</p>
            <a
              href="/find-coach"
              className="block w-full text-center bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[14px] font-bold py-3 rounded-xl transition-colors"
            >
              Buscar entrenador →
            </a>
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
          <p className="text-[12px] text-gray-400 mt-0.5">{planName} · {totalWeeks} semanas</p>
        </div>
        <div className="flex items-center gap-2 text-green-600 text-[12px] font-bold">
          <span>✓</span> PLAN COMPLETADO
        </div>
      </div>

      {/* Calendar Strip — Last week of completed plan */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        <div className="grid grid-cols-7 divide-x divide-gray-50">
          {Array.from({ length: 7 }, (_, i) => {
            const dow = i + 1
            const session = sessionsByDow.get(dow)
            const isDone = session?.done ?? false
            const isRest = session?.type === 'DESCANSO' || session?.type === 'REST'
            const emoji = session ? (SESSION_EMOJI[session.type] ?? '🏃') : null

            const barColor = isDone && !isRest ? 'bg-[#22c55e]' : 'bg-gray-200'
            const cardBg = isDone && !isRest
              ? 'bg-green-50/60'
              : 'bg-[#f5f7fa]'

            return (
              <div
                key={dow}
                className={cn('flex flex-col items-center py-3.5 px-1 text-center relative min-h-[150px]', cardBg)}
              >
                <div className={cn('absolute top-0 left-0 right-0 h-[3px]', barColor)} />

                <span className="text-[11px] font-semibold mb-1 text-gray-400">
                  {WEEK_DAYS[i]}
                </span>

                <div className="flex items-center gap-1 mb-2">
                  <span className={cn('text-[22px] font-black leading-none',
                    isDone && !isRest ? 'text-green-600' : 'text-gray-300'
                  )}>
                    {i + 14}
                  </span>
                  {isDone && !isRest && (
                    <span className="text-[10px] font-bold text-green-600">✓</span>
                  )}
                </div>

                {emoji && (
                  <span className="text-lg mb-1">{emoji}</span>
                )}

                {session && (
                  <>
                    <span className="text-[11px] font-semibold leading-tight text-gray-700 mt-auto">
                      {session.label}
                    </span>
                    {!isRest && session.durationMin > 0 && (
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {session.durationMin} min · {session.zone || 'Z2'}
                      </span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen del plan</p>
          <PlanCompletionCard
            planName={planName}
            totalWeeks={totalWeeks}
            sessionsLogged={sessionsLogged}
            sessionsTotal={sessionsTotal}
            recoveryDaysSinceEnd={recoveryDaysSinceEnd}
            isB2B={isB2B}
          />
        </div>

        <div className="xl:col-span-2 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Esta semana</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Completadas</p>
              <p className="text-[20px] font-black leading-none text-gray-900">{sessionsLogged}/{sessionsTotal}</p>
              <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sesiones</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Volumen</p>
              <p className="text-[20px] font-black leading-none text-gray-900">{totalWeeks * 4}</p>
              <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">en el plan</p>
            </div>
            <div className={cn('bg-white rounded-xl shadow-sm p-3', completedAdherencePct < 80 ? 'border-2 border-[#ea580c]/30' : 'border border-gray-100')}>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Adherencia</p>
              <p className="text-[20px] font-black leading-none text-[#ea580c]">{completedAdherencePct}%</p>
              <p className={cn('text-[10px] mt-1 whitespace-nowrap', completedAdherencePct < 80 ? 'text-red-500' : 'text-gray-400')}>
                {completedAdherencePct < 80 ? '↓ meta 80%' : '✓ objetivo'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-gray-900">Progreso del plan</p>
              <p className="text-[11px] text-gray-400">
                Sem. {currentWeek} / {totalWeeks} · 100%
              </p>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${displayPhases.length}, 1fr)` }}>
              {displayPhases.map((phase, i) => (
                <div
                  key={i}
                  className="h-8 rounded-md flex items-center justify-center text-[9px] font-bold uppercase tracking-wide bg-[#1e3a5f] text-white"
                >
                  {phase}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {isB2B ? (
              <>
                <p className="text-[13px] font-bold text-[#1e3a5f]">Tu coach asignará el próximo plan</p>
                <p className="text-[11px] text-gray-400">Recibirás una notificación cuando tu entrenador lo tenga listo.</p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-[#1e3a5f]">¿Listo para el siguiente desafío?</p>
                <a
                  href="/find-coach"
                  className="block w-full text-center bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-[14px] font-bold px-5 py-3 rounded-xl transition-colors"
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
