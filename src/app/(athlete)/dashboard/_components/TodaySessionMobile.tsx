import Link from 'next/link'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import type { DashboardMode, TodaySessionData } from '../_lib/get-dashboard-data'

type RoutineDayConfig = { dow: number; activity: 'GYM' | 'RUN' | 'REST'; split?: string; runType?: string }

type Props = {
  dashboardMode: DashboardMode
  todaySession: TodaySessionData | null
  todayRoutineDay: RoutineDayConfig | null
  hasGymToday: boolean
  gymDoneToday: boolean
  assignedWorkoutName: string | null
  lastCompletedPlanName: string | null
  recoveryDaysSinceEnd: number | null
}

export default function TodaySessionMobile({
  dashboardMode, todaySession, todayRoutineDay, hasGymToday, gymDoneToday,
  assignedWorkoutName, lastCompletedPlanName, recoveryDaysSinceEnd,
}: Props) {
  return (
    <div className="sm:hidden">
      {todaySession ? (
        <PlannedSessionCard session={todaySession} />
      ) : dashboardMode === 'FREE' ? (
        <FreeModeTodayCard todayRoutineDay={todayRoutineDay} />
      ) : dashboardMode === 'RECOVERY' ? (
        <RecoveryCard planName={lastCompletedPlanName} recoveryDaysSinceEnd={recoveryDaysSinceEnd} />
      ) : hasGymToday ? (
        <GymTodayCard workoutName={assignedWorkoutName} gymDoneToday={gymDoneToday} />
      ) : (
        <RestDayCard />
      )}
    </div>
  )
}

function PlannedSessionCard({ session }: { session: TodaySessionData }) {
  return (
    <div className="rounded-[20px] overflow-hidden shadow-sm">
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-4 pt-3.5 pb-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-semibold text-white/55 tracking-widest uppercase">Hoy</span>
          {session.zoneTarget && session.zoneTarget !== 'N/A' && (
            <span className="bg-green-500/[0.28] text-green-300 text-[11px] font-semibold px-2 py-0.5 rounded-lg">
              ● Zona {session.zoneTarget}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[34px]">{SESSION_ICONS[session.type] ?? '🏅'}</span>
          <div className="flex-1">
            <span className="text-[26px] font-black text-white tracking-tight leading-none">{session.durationMin} min</span>
          </div>
          {session.completed && (
            <span className="bg-green-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">✓ Hecha</span>
          )}
        </div>
        <span className="text-[11px] text-white/60">{SESSION_NAMES[session.type] ?? session.type.replace(/_/g, ' ').toLowerCase()}</span>
      </div>
      {session.completed ? (
        <div className="bg-white px-4 py-3">
          <Link href={session.logType === 'gym' ? '/gym/history' : '/progress'}
            className="block bg-[#1e3a5f] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">
            Ver resumen →
          </Link>
        </div>
      ) : (
        <div className="bg-white px-4 py-3">
          <Link href={session.id === 'gym-today' ? '/gym/session' : `/log/run?sessionId=${session.id}&type=${session.type}&duration=${session.durationMin}&zone=${session.zoneTarget}`}
            className="block bg-[#ea580c] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">
            {session.id === 'gym-today' ? 'Ir al Gym →' : 'Registrar sesión'}
          </Link>
        </div>
      )}
    </div>
  )
}

function FreeModeTodayCard({ todayRoutineDay }: { todayRoutineDay: RoutineDayConfig | null }) {
  if (todayRoutineDay?.activity === 'GYM') {
    return (
      <div className="rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-4 pt-3.5 pb-4 space-y-2">
          <span className="text-[9px] font-semibold text-white/55 tracking-widest uppercase">Hoy</span>
          <div className="flex items-center gap-3">
            <span className="text-[34px]">💪</span>
            <span className="text-[22px] font-black text-white tracking-tight">Entreno hoy</span>
          </div>
        </div>
        <div className="bg-white px-4 py-3">
          <Link href="/gym" className="block bg-[#1e3a5f] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">Empezar</Link>
        </div>
      </div>
    )
  }

  if (todayRoutineDay?.activity === 'RUN') {
    return (
      <div className="rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="bg-gradient-to-b from-[#ea580c] to-[#d14d07] px-4 pt-3.5 pb-4 space-y-2">
          <span className="text-[9px] font-semibold text-white/55 tracking-widest uppercase">Hoy</span>
          <div className="flex items-center gap-3">
            <span className="text-[34px]">🏃</span>
            <span className="text-[22px] font-black text-white tracking-tight">Correr hoy</span>
          </div>
        </div>
        <div className="bg-white px-4 py-3">
          <Link href="/log/run" className="block bg-[#ea580c] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">Registrar</Link>
        </div>
      </div>
    )
  }

  if (todayRoutineDay?.activity === 'REST') {
    return (
      <div className="bg-white rounded-[20px] p-[18px] flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <span className="text-[28px]">😴</span>
        <div>
          <p className="text-[15px] font-semibold text-gray-900">Descanso hoy según tu rutina</p>
          <p className="text-[13px] text-gray-500 mt-0.5">Recupera bien — vuelves mañana</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="h-[3px] bg-[#ea580c]" />
      <div className="px-5 pt-5 pb-4 text-center space-y-2">
        <div className="flex justify-center">
          <span className="flex items-center gap-1.5 text-[#ea580c] text-[10px] font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#ea580c]" /> Hoy
          </span>
        </div>
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-[#ea580c]/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <p className="text-[17px] font-bold text-gray-900">Sin sesión planificada</p>
        <p className="text-[13px] text-gray-400">Registra tu entrenamiento de hoy</p>
        <Link href="/log/run" className="block bg-[#ea580c] text-white text-[15px] font-bold text-center py-3.5 rounded-xl mt-3">
          Registrar actividad →
        </Link>
      </div>
    </div>
  )
}

function RecoveryCard({ planName, recoveryDaysSinceEnd }: { planName: string | null; recoveryDaysSinceEnd: number | null }) {
  return (
    <div className="rounded-[20px] overflow-hidden shadow-sm">
      <div className="h-[3px] bg-green-500" />
      <div className="bg-green-50 p-[18px] flex items-center gap-3.5">
        <span className="text-[32px]">🏆</span>
        <div className="flex-1">
          <span className="text-[9px] font-semibold text-green-600 tracking-widest uppercase">Plan completado</span>
          <p className="text-[15px] font-bold text-green-900 mt-1">{planName ?? 'Plan terminado'}</p>
          <p className="text-[12px] text-green-500 mt-1">
            {recoveryDaysSinceEnd != null && recoveryDaysSinceEnd <= 14
              ? `Recuperación activa · ${14 - recoveryDaysSinceEnd} dias restantes`
              : 'Listo para un nuevo plan'}
          </p>
        </div>
      </div>
    </div>
  )
}

function GymTodayCard({ workoutName, gymDoneToday }: { workoutName: string | null; gymDoneToday: boolean }) {
  return (
    <div className="rounded-[20px] overflow-hidden shadow-sm">
      <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-4 pt-3.5 pb-4 space-y-2">
        <span className="text-[9px] font-semibold text-white/55 tracking-widest uppercase">Hoy</span>
        <div className="flex items-center gap-3">
          <span className="text-[34px]">💪</span>
          <span className="text-[22px] font-black text-white tracking-tight">
            {workoutName ?? 'Entreno hoy'}
          </span>
        </div>
      </div>
      <div className="bg-white px-4 py-3">
        {gymDoneToday ? (
          <Link href="/gym/history" className="block bg-[#1e3a5f] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">
            Ver resumen →
          </Link>
        ) : (
          <Link href="/gym/session" className="block bg-[#ea580c] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">
            Empezar
          </Link>
        )}
      </div>
    </div>
  )
}

function RestDayCard() {
  return (
    <div className="bg-white rounded-[20px] p-[18px] flex items-center gap-3 shadow-sm">
      <span className="text-[28px]">😴</span>
      <div>
        <p className="text-[15px] font-semibold text-gray-900">Día de descanso</p>
        <p className="text-[13px] text-gray-500 mt-0.5">Recupera bien hoy</p>
      </div>
    </div>
  )
}
