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

type RoutineDay = {
  activity: 'GYM' | 'RUN' | 'REST'
  split?: string | null
  runType?: string | null
}

type WeekActivity = {
  dateStr: string
  label: string
  emoji: string
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
  // Self-directed mode
  todayRoutineDay?: RoutineDay | null
  weekSessionCount?: number
  weekSessionTarget?: number
  weekActivities?: WeekActivity[]
}

const RUN_TYPE_LABELS: Record<string, string> = {
  RODAJE_Z2:    'Rodaje Z2 — fácil',
  FARTLEK:      'Fartlek',
  TEMPO:        'Tempo',
  INTERVALOS:   'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  OTRO:         'Sesión libre',
}

const SPLIT_LABELS: Record<string, string> = {
  PUSH:      'Push — Pecho / Hombros / Tríceps',
  PULL:      'Pull — Espalda / Bíceps',
  LEGS:      'Piernas — Cuádriceps / Glúteos',
  FULL_BODY: 'Full Body',
}

export default function DailySessionCard({
  dashboardMode, isCurrentWeek, todaySession, hasActivePlan,
  hasGymToday, gymDoneToday = false, todayGymDay, planPhase, phaseDisplay, phaseColors,
  selectedWeekNum, totalWeeks, completedCount, totalTraining,
  todayRoutineDay, weekSessionCount = 0, weekSessionTarget = 4,
  weekActivities = [],
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
                  {todaySession.zoneTarget && todaySession.zoneTarget !== '—' && todaySession.zoneTarget !== '' && todaySession.zoneTarget !== 'N/A' && (
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
              <Link href="/plan" className="text-xs font-semibold text-gray-400 hover:text-[#1e3a5f] transition-colors whitespace-nowrap py-2 -my-2 inline-block">
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

      {/* FREE: hoy según rutina + acciones */}
      {dashboardMode === 'FREE' && isCurrentWeek && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">

          {/* Actividad de hoy según rutina */}
          {todayRoutineDay && todayRoutineDay.activity !== 'REST' ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">
                  {todayRoutineDay.activity === 'GYM' ? '💪' : '🏃'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {todayRoutineDay.activity === 'GYM'
                      ? (todayRoutineDay.split ? SPLIT_LABELS[todayRoutineDay.split] ?? todayRoutineDay.split : 'Ejercicios')
                      : (todayRoutineDay.runType ? RUN_TYPE_LABELS[todayRoutineDay.runType] ?? todayRoutineDay.runType : 'Running')}
                  </p>
                  <p className="text-xs text-gray-400">Según tu rutina semanal</p>
                </div>
              </div>
              {todayRoutineDay.activity === 'GYM' ? (
                gymDoneToday ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
                    <CheckCircle2 size={13} /> Completada
                  </span>
                ) : (
                  <Link href="/gym/session" className="text-xs font-semibold bg-[#ea580c] text-white px-3 py-1.5 rounded-lg whitespace-nowrap">
                    Empezar
                  </Link>
                )
              ) : (
                <Link href="/log/run" className="text-xs font-semibold bg-[#ea580c] text-white px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Registrar
                </Link>
              )}
            </div>
          ) : todayRoutineDay?.activity === 'REST' ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>😴</span>
              <span>Día de descanso según tu rutina</span>
            </div>
          ) : (
            /* Sin rutina configurada */
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400">¿Qué entrenas hoy?</p>
                <div className="flex gap-2">
                  <Link href="/gym/session" className="text-xs font-semibold border border-gray-200 text-[#1e3a5f] px-3 py-1.5 rounded-lg">
                    💪 Ejercicios
                  </Link>
                  <Link href="/log/run" className="text-xs font-semibold border border-gray-200 text-[#1e3a5f] px-3 py-1.5 rounded-lg">
                    🏃 Correr
                  </Link>
                </div>
              </div>
              <Link
                href="/routine/edit"
                className="block w-full text-center text-xs font-semibold text-[#ea580c] border border-dashed border-[#ea580c]/40 rounded-lg py-2 hover:bg-[#ea580c]/5 transition-colors"
              >
                + Configurar mi rutina semanal
              </Link>
            </div>
          )}

          {/* Logs reales de la semana */}
          {weekActivities.length > 0 && (
            <div className="space-y-1 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Lo que hiciste esta semana</p>
              {weekActivities.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{a.emoji}</span>
                  <span className="font-medium capitalize">{a.dateStr}</span>
                  <span className="text-gray-400">·</span>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Consistencia semanal */}
          <div className="flex items-center justify-between pt-1">
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
            <div className="flex items-center gap-3">
              <Link href="/routine/edit" className="text-[11px] text-gray-400 hover:text-[#ea580c]">
                Editar rutina
              </Link>
              <Link href="/log/history" className="text-[11px] text-gray-400 hover:text-[#1e3a5f]">
                Ver historial →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TRAINING: footer badges de fase + semana + adherencia */}
      {dashboardMode === 'TRAINING' && hasActivePlan && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2 flex-wrap items-center">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${phaseColors[planPhase] ?? 'bg-gray-100 text-gray-600'}`}>
            Fase {phaseDisplay}
          </span>
          {selectedWeekNum != null && totalWeeks != null && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
              Semana {selectedWeekNum}/{totalWeeks}
            </span>
          )}
          {completedCount != null && totalTraining != null && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
              {completedCount}/{totalTraining} completadas
            </span>
          )}
        </div>
      )}
    </>
  )
}
