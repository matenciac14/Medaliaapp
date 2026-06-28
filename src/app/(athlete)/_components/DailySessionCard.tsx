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
  dashboardMode: 'TRAINING' | 'RECOVERY' | 'FREE'
  isCurrentWeek: boolean
  todaySession: TodaySession | null
  hasActivePlan: boolean
  hasGymToday: boolean
  todayGymDay: GymDay | null
  planPhase: string
  phaseDisplay: string
  phaseColors: Record<string, string>
  selectedWeekNum?: number | null
  totalWeeks?: number | null
  completedCount?: number | null
  totalTraining?: number | null
}

export default function DailySessionCard({
  dashboardMode, isCurrentWeek, todaySession, hasActivePlan,
  hasGymToday, todayGymDay, planPhase, phaseDisplay, phaseColors,
  selectedWeekNum, totalWeeks, completedCount, totalTraining,
}: Props) {
  return (
    <>
      {/* TRAINING: detalle sesión de hoy */}
      {dashboardMode === 'TRAINING' && isCurrentWeek && todaySession && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{SESSION_ICONS[todaySession.type] ?? '🏅'}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {SESSION_NAMES[todaySession.type] ?? todaySession.type.replace(/_/g, ' ')}
                </p>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {todaySession.durationMin} min
                  </span>
                  {todaySession.zoneTarget && todaySession.zoneTarget !== '—' && todaySession.zoneTarget !== '' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Zona {todaySession.zoneTarget}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                    ${todaySession.intensity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      todaySession.intensity === 'LOW' ? 'bg-green-100 text-green-700' :
                      'bg-sky-100 text-sky-700'}`}>
                    {todaySession.intensity === 'HIGH' ? '🔥 ALTA' :
                     todaySession.intensity === 'LOW' ? '🌿 BAJA' : '⚡ MODERADA'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {todaySession.completed ? (
                <span className="flex items-center gap-1 text-[#22c55e] text-sm font-semibold">
                  <CheckCircle2 size={16} /> Completada
                </span>
              ) : (
                <QuickLog sessionId={todaySession.id} initialCompleted={false} />
              )}
              <Link href="/plan" className="text-xs font-semibold text-gray-400 hover:text-[#1e3a5f] transition-colors whitespace-nowrap">
                Ver mi plan →
              </Link>
            </div>
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
          <Link href="/gym/session" className="text-xs font-semibold bg-[#f97316] text-white px-3 py-1.5 rounded-lg">
            Empezar
          </Link>
        </div>
      )}

      {/* RECOVERY footer */}
      {dashboardMode === 'RECOVERY' && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Movilidad, caminatas o descanso activo. Sin intensidad.</p>
          <Link href="/log" className="text-xs font-semibold text-gray-400 hover:text-[#1e3a5f] whitespace-nowrap">
            Registrar →
          </Link>
        </div>
      )}

      {/* FREE footer */}
      {dashboardMode === 'FREE' && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Entrenamiento libre — sin estructura fija</p>
          <Link href="/log" className="text-xs font-semibold text-[#f97316] hover:opacity-80 whitespace-nowrap">
            + Registrar sesión
          </Link>
        </div>
      )}

      {/* TRAINING: footer badges de fase + semana + adherencia */}
      {dashboardMode === 'TRAINING' && hasActivePlan && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2 flex-wrap items-center">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${phaseColors[planPhase] ?? 'bg-gray-100 text-gray-600'}`}>
            Fase {phaseDisplay}
          </span>
          {selectedWeekNum != null && totalWeeks != null && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
              Semana {selectedWeekNum}/{totalWeeks}
            </span>
          )}
          {completedCount != null && totalTraining != null && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
              {completedCount}/{totalTraining} completadas
            </span>
          )}
        </div>
      )}
    </>
  )
}
