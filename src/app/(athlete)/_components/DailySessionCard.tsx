import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import QuickLog from './QuickLog'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'

type TodaySession = {
  id: string
  type: string
  intensity: string
  durationMin: number
  zoneTarget: string
  detailText: string
  completed: boolean
}

type GymDay = {
  label: string
  exercises: unknown[]
}

type Props = {
  dashboardMode: 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM'
  isCurrentWeek: boolean
  todaySession: TodaySession | null
  hasActivePlan: boolean
  hasGymToday: boolean
  gymDoneToday?: boolean
  todayGymDay: GymDay | null
  planPhase: string
  phaseDisplay: string
  phaseColors: Record<string, string>
  selectedWeekNum?: number | null
  totalWeeks?: number | null
  completedCount?: number | null
  totalTraining?: number | null
  weekSessionCount?: number
  weekSessionTarget?: number
  // B2B coach info
  isB2B?: boolean
  coachName?: string | null
}

export default function DailySessionCard({
  dashboardMode, isCurrentWeek, todaySession, hasActivePlan,
  hasGymToday, gymDoneToday = false, todayGymDay, planPhase, phaseDisplay, phaseColors,
  selectedWeekNum, totalWeeks, completedCount, totalTraining,
  weekSessionCount = 0, weekSessionTarget = 4,
  isB2B = false, coachName,
}: Props) {
  return (
    <>
      {/* TRAINING: detalle sesión de hoy */}
      {dashboardMode === 'TRAINING' && isCurrentWeek && todaySession && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Row 1: Emoji + nombre + botones */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{SESSION_ICONS[todaySession.type] ?? '🏅'}</span>
              <p className="text-sm font-semibold text-gray-900">
                {SESSION_NAMES[todaySession.type] ?? todaySession.type.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/plan" className="text-xs font-semibold text-[#1e3a5f] border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap">
                Ver mi plan →
              </Link>
              {todaySession.completed ? (
                <span className="flex items-center gap-1 text-white text-xs font-semibold bg-[#22c55e] px-4 py-2 rounded-xl">
                  <CheckCircle2 size={14} /> Completada
                </span>
              ) : (
                <QuickLog sessionId={todaySession.id} initialCompleted={false} />
              )}
            </div>
          </div>
          {/* Row 2: Pills de sesión */}
          <div className="flex gap-1.5 flex-wrap mt-3">
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              {todaySession.durationMin} min
            </span>
            {todaySession.zoneTarget && todaySession.zoneTarget !== '—' && todaySession.zoneTarget !== '' && todaySession.zoneTarget !== 'N/A' && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                Zona {todaySession.zoneTarget}
              </span>
            )}
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              Carrera
            </span>
            {isB2B && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#1e3a5f]">
                👤 COACH
              </span>
            )}
          </div>
        </div>
      )}

      {/* TRAINING: descanso de sport, pero puede haber gym */}
      {dashboardMode === 'TRAINING' && isCurrentWeek && hasActivePlan && !todaySession && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
          <span>😴</span>
          <span>Descanso hoy</span>
        </div>
      )}

      {/* Gym hoy sin sesión de sport */}
      {isCurrentWeek && hasGymToday && !todaySession && todayGymDay && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>💪</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{todayGymDay.label}</p>
              <p className="text-xs text-gray-500">{todayGymDay.exercises.length} ejercicios</p>
            </div>
          </div>
          {gymDoneToday ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={13} /> Completada
            </span>
          ) : (
            <Link href="/gym/session" className="text-xs font-semibold bg-[#ea580c] text-white px-3 py-1.5 rounded-lg">
              Empezar
            </Link>
          )}
        </div>
      )}

      {/* GYM: día de descanso cuando no hay sesión programada hoy */}
      {dashboardMode === 'GYM' && isCurrentWeek && !hasGymToday && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
          <span>😴</span>
          <span>Día de descanso según tu rutina</span>
        </div>
      )}

      {/* GYM footer: consistencia semanal */}
      {dashboardMode === 'GYM' && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: weekSessionTarget }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${i < weekSessionCount ? 'bg-[#ea580c]' : 'bg-gray-200'}`}
              />
            ))}
            <span className="text-[11px] text-gray-500 ml-1">
              {weekSessionCount}/{weekSessionTarget} días esta semana
            </span>
          </div>
          <Link href="/gym" className="text-[11px] text-gray-400 hover:text-[#1e3a5f]">
            Ver rutina →
          </Link>
        </div>
      )}

      {/* RECOVERY footer */}
      {dashboardMode === 'RECOVERY' && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Movilidad, caminatas o descanso activo. Sin intensidad.</p>
          <Link href="/log/run" className="text-xs font-semibold text-gray-400 hover:text-[#1e3a5f] whitespace-nowrap">
            Registrar →
          </Link>
        </div>
      )}

      {/* TRAINING: badges de fase + semana + completadas */}
      {dashboardMode === 'TRAINING' && hasActivePlan && (
        <div className="flex gap-2 flex-wrap items-center mt-2">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${phaseColors[planPhase] ?? 'bg-gray-100 text-gray-600'}`}>
            Fase {phaseDisplay}
          </span>
          {selectedWeekNum != null && totalWeeks != null && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              Semana {selectedWeekNum}/{totalWeeks}
            </span>
          )}
          {isB2B && coachName ? (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              Coach: {coachName}
            </span>
          ) : completedCount != null && totalTraining != null ? (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              {completedCount}/{totalTraining} completadas
            </span>
          ) : null}
        </div>
      )}
    </>
  )
}
