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

  // Normalize phases for display
  const displayPhases = phases.length > 0
    ? [...new Set(phases.map(p => PHASE_LABELS[p] ?? p))]
    : ['BASE', 'DESARRO', 'ESPECÍF', 'AFIN.']

  return (
    <div className="px-4 py-6 md:px-8 max-w-7xl mx-auto">
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
        {/* Left — Celebration card */}
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

        {/* Right — KPIs + Phase progress + CTA */}
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

          {/* Phase progress bar */}
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
  )
}
