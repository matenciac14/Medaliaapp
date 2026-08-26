import Link from 'next/link'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import QuickSessionFeedback from '../../_components/QuickSessionFeedback'
import TodayLogCard from '../../_components/TodayLogCard'
import NutritionSnapshot from '../../_components/ui/NutritionSnapshot'
import type { DashboardMode, TodaySessionData } from '../_lib/get-dashboard-data'
import type { DashboardSummary } from '@/domain/dashboard/get-dashboard-summary.use-case'

type Props = {
  dashboardMode: DashboardMode
  dashSummary: DashboardSummary
  todaySession: TodaySessionData | null

  // FREE mode
  hasEverLogged: boolean

  // Weight
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null

  // Volume
  currentVolume: number | null
  volumeDeltaPct: number | null

  // Coach
  coachRelation: {
    coach: {
      name: string | null
      coachProfile: { headline: string | null; specialties: string[] | null } | null
    }
  } | null

  // Check-in
  lastCheckIn: { hardestSessionRpe: number | null; energyLevel: number | null; weightKg: number | null; sleepHours: number | null } | null
  formCheckInDate: string | null
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  checkinPending: boolean
  isRecomp: boolean
  raceDays: number | null

  // Gym
  gymDoneToday: boolean
  todayGymSession: { id: string; durationMin: number | null; energyState: string | null } | null
  todayGymDay: { label?: string } | null

  // Today log
  todayLogRaw: { weightKg: number | null; energyLevel: number | null } | null
}

export default function MobileCardsSection(props: Props) {
  return (
    <div className="sm:hidden space-y-3">
      {props.dashboardMode === 'FREE' ? (
        <FreeMobileCards {...props} />
      ) : (
        <B2BMobileCards {...props} />
      )}
    </div>
  )
}

// ── FREE Mode Cards ──────────────────────────────────────────────────────────

function FreeMobileCards(props: Props) {
  const { todaySession, gymDoneToday, todayGymSession, todayGymDay, dashSummary, hasEverLogged, currentWeight, targetWeight, weeklyWeightChange, weightProgressPct, todayLogRaw } = props

  return (
    <>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pt-1 border-t border-gray-100">Tu actividad</p>

      {/* QuickSessionFeedback — session completed today */}
      {todaySession?.completed && todaySession.logId && (
        <QuickSessionFeedback
          logId={todaySession.logId}
          logType={todaySession.logType}
          sessionLabel={SESSION_NAMES[todaySession.type] ?? todaySession.type.replace(/_/g, ' ')}
          sessionIcon={SESSION_ICONS[todaySession.type] ?? '🏅'}
          sessionMeta={` · ${todaySession.durationMin} min${todaySession.zoneTarget && todaySession.zoneTarget !== 'N/A' && todaySession.zoneTarget !== '—' ? ` · ${todaySession.zoneTarget}` : ''}`}
        />
      )}

      {/* QuickSessionFeedback — gym completed today */}
      {!todaySession?.completed && gymDoneToday && todayGymSession && !todayGymSession.energyState && (
        <QuickSessionFeedback
          logId={todayGymSession.id}
          logType="gym"
          sessionLabel={todayGymDay?.label ?? 'Fuerza'}
          sessionIcon="💪"
          sessionMeta={todayGymSession.durationMin ? ` · ${todayGymSession.durationMin} min` : ''}
        />
      )}

      {/* Insights Pro upsell */}
      {hasEverLogged && !todaySession?.completed && (
        <Link href="/pricing" className="block bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-3.5 py-3">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">✨ Insights Pro</p>
            <p className="text-[15px] font-semibold text-gray-900 mb-2">Desbloquea con Plan Pro</p>
            <div className="flex gap-2">
              <span className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2.5 py-1">Check-in</span>
              <span className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2.5 py-1">RPE</span>
              <span className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2.5 py-1">Zonas</span>
            </div>
          </div>
        </Link>
      )}

      {/* Recent activity */}
      {hasEverLogged ? (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[3px] bg-[#ea580c]" />
          {dashSummary.recentActivity.slice(0, 3).map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <span className="text-[22px]">{SESSION_ICONS[a.type] ?? '🏅'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">{SESSION_NAMES[a.type] ?? a.type.replace(/_/g, ' ')}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {a.durationMin ? ` · ${a.durationMin} min` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[3px] bg-[#ea580c]" />
          <div className="px-3.5 py-3">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-2">📋 Última actividad</p>
            <div className="flex items-center gap-2.5">
              <span className="text-[28px]">📝</span>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-gray-900">Registra tu primera sesión</p>
                <p className="text-[12px] text-[#ea580c] mt-0.5">
                  <Link href="/log/run">Running</Link> · <Link href="/gym">Entreno</Link> · Lo que practiques →
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meta de Peso */}
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pt-1 border-t border-gray-100">Meta de peso</p>
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="h-[3px] bg-[#3b82f6]" />
        <div className="px-3.5 py-3 flex items-start">
          <div className="flex-1">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">META DE PESO</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#1e3a5f] tracking-tight leading-none">
                {currentWeight ? currentWeight.toFixed(1) : '—'}
              </span>
              <span className="text-sm text-gray-400">kg</span>
              {targetWeight && (
                <span className="text-xs font-semibold text-[#22c55e]">→ {targetWeight} kg</span>
              )}
            </div>
            {!currentWeight && (
              <Link href="/progress" className="text-[11px] font-semibold text-[#ea580c] mt-1.5 block">Configura tu meta →</Link>
            )}
            {weeklyWeightChange != null && (
              <p className={`text-[10px] mt-1 ${
                (() => {
                  const losing = (currentWeight ?? 0) > (targetWeight ?? 0)
                  return losing
                    ? (weeklyWeightChange < 0 ? 'text-[#22c55e]' : 'text-red-500')
                    : (weeklyWeightChange > 0 ? 'text-[#22c55e]' : 'text-red-500')
                })()
              }`}>
                {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange} kg esta semana
              </p>
            )}
          </div>
          {weightProgressPct != null ? (
            <div className="bg-green-50 rounded-xl p-2.5 text-center min-w-[60px]">
              <p className="text-lg font-black text-[#22c55e]">{weightProgressPct}%</p>
              <p className="text-[9px] text-gray-400">del objetivo</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-2.5 text-center min-w-[60px]">
              <p className="text-lg font-black text-gray-300">0%</p>
              <p className="text-[9px] text-gray-400">sin datos aún</p>
            </div>
          )}
        </div>
      </div>

      {/* Nutrición Hoy */}
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pt-1 border-t border-gray-100">Nutrición hoy</p>
      {dashSummary.nutritionTarget && (
        <NutritionSnapshot
          data={{ kcal: dashSummary.nutritionTarget.kcal, proteinG: dashSummary.nutritionTarget.proteinG, carbsG: dashSummary.nutritionTarget.carbsG, fatG: dashSummary.nutritionTarget.fatG }}
          variant="compact"
        />
      )}

      <TodayLogCard initial={todayLogRaw ?? null} />

      {/* Desbloquea Plan Pro */}
      <UpsellBannerPro />

      {/* Encuentra tu entrenador */}
      <FindCoachBanner />
    </>
  )
}

// ── B2B/Pro Mode Cards ───────────────────────────────────────────────────────

function B2BMobileCards(props: Props) {
  const {
    coachRelation, checkinPending, formStatus, formMessage, lastCheckIn,
    formCheckInDate, isRecomp, currentWeight, targetWeight, raceDays,
    weeklyWeightChange, weightProgressPct, currentVolume, volumeDeltaPct,
    dashSummary, todayLogRaw,
  } = props

  return (
    <>
      {/* Coach card */}
      {coachRelation && (
        <Link href="/messages" className="flex items-center bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="w-1 h-14 bg-[#ea580c] shrink-0" />
          <div className="flex-1 flex items-center gap-3 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-[#ea580c] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {(coachRelation.coach.name ?? 'C').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1e3a5f] truncate">Coach {(coachRelation.coach.name ?? '').split(' ')[0]}</p>
              <p className="text-[11px] text-gray-500 truncate">{coachRelation.coach.coachProfile?.headline ?? 'Entrenador personal'}</p>
            </div>
            <span className="text-sm text-gray-300">›</span>
          </div>
        </Link>
      )}

      {/* Check-in pendiente */}
      {checkinPending && (
        <Link href="/checkin" className="flex items-center bg-orange-50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="w-1 bg-[#ea580c] shrink-0 self-stretch" />
          <div className="flex-1 px-3.5 py-3">
            <p className="text-xs font-semibold text-orange-900">Check-in semanal pendiente</p>
            <p className="text-[10px] text-orange-700 mt-1">Registra métricas · tu plan se ajusta automáticamente →</p>
          </div>
        </Link>
      )}

      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pt-1 border-t border-gray-100">Resumen rápido</p>

      {/* Como llegas hoy */}
      <Link href="/checkin" className={`block rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden
        ${formStatus === 'good' ? 'bg-green-50' : formStatus === 'moderate' ? 'bg-amber-50' : 'bg-red-50'}`}>
        <div className="px-3.5 py-3">
          <p className={`text-[9px] font-semibold uppercase tracking-widest mb-1.5
            ${formStatus === 'good' ? 'text-green-600' : formStatus === 'moderate' ? 'text-amber-600' : 'text-red-600'}`}>
            ⚡ Cómo llegas hoy
          </p>
          <p className="text-[14px] font-bold text-[#1e3a5f] leading-tight mb-2">{formMessage}</p>
          {lastCheckIn && (
            <div className="flex gap-1.5 flex-wrap">
              {lastCheckIn.energyLevel != null && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                  ${formStatus === 'good' ? 'bg-green-100 text-green-700' : formStatus === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  Energía{lastCheckIn.energyLevel}/10
                </span>
              )}
              {lastCheckIn.hardestSessionRpe != null && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  RPE {lastCheckIn.hardestSessionRpe}/10
                </span>
              )}
              {lastCheckIn.sleepHours != null && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Sueño{lastCheckIn.sleepHours}h
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Último Check-in */}
      {lastCheckIn && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-3.5 py-3">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">🔔 Último Check-in</p>
            {formCheckInDate && <p className="text-[9px] text-gray-400">{formCheckInDate}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {lastCheckIn.hardestSessionRpe != null && (
              <div className="bg-orange-50 rounded-xl px-3 py-2">
                <p className="text-base font-semibold text-[#ea580c] leading-none">{lastCheckIn.hardestSessionRpe}/10</p>
                <p className="text-[10px] text-gray-500 mt-1">RPE</p>
              </div>
            )}
            {lastCheckIn.energyLevel != null && (
              <div className="bg-green-50 rounded-xl px-3 py-2">
                <p className="text-base font-semibold text-[#22c55e] leading-none">{lastCheckIn.energyLevel}/5 ★</p>
                <p className="text-[10px] text-gray-500 mt-1">Energia</p>
              </div>
            )}
            {lastCheckIn.weightKg != null && (
              <div className="bg-blue-50 rounded-xl px-3 py-2">
                <p className="text-base font-semibold text-[#3b6fdd] leading-none">{lastCheckIn.weightKg} kg</p>
                <p className="text-[10px] text-gray-500 mt-1">Peso</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tu Carrera / Tu Objetivo */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="h-[3px] bg-[#ea580c]" />
        <div className="px-3.5 py-3">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            {isRecomp ? '🎯 Tu Objetivo' : '🏁 Tu Carrera'}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-[#ea580c] tracking-tight leading-none">
              {isRecomp
                ? (currentWeight && targetWeight ? Math.abs(currentWeight - targetWeight).toFixed(1) : '—')
                : (raceDays != null && raceDays > 0 ? raceDays : '—')}
            </span>
            <span className="text-sm font-semibold text-gray-400">
              {isRecomp ? 'kg restantes' : 'días'}
            </span>
          </div>
        </div>
      </div>

      {/* Meta de Peso */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="h-[3px] bg-[#3b6fdd]" />
        <div className="px-3.5 py-3 flex items-start">
          <div className="flex-1">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">⚖️ Meta de peso</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#1e3a5f] tracking-tight leading-none">
                {currentWeight ? currentWeight.toFixed(1) : '—'}
              </span>
              <span className="text-sm text-gray-400">kg</span>
              {targetWeight && (
                <span className="text-sm font-semibold text-[#22c55e]">→ {targetWeight} kg</span>
              )}
            </div>
            {weeklyWeightChange != null && (
              <p className={`text-[10px] mt-1 ${weeklyWeightChange < 0 ? 'text-green-600' : 'text-red-500'}`}>
                {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange.toFixed(1)} kg esta semana
              </p>
            )}
          </div>
          {weightProgressPct != null && (
            <div className="bg-green-50 rounded-xl p-2.5 text-center min-w-[60px]">
              <p className="text-lg font-black text-[#22c55e]">{weightProgressPct}%</p>
              <p className="text-[9px] text-gray-400">del objetivo</p>
            </div>
          )}
        </div>
      </div>

      {/* Carga Semanal */}
      {currentVolume != null && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[3px] bg-[#ea580c]" />
          <div className="px-3.5 py-3 flex items-start">
            <div className="flex-1">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">🏃 Carga semanal</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#ea580c] tracking-tight leading-none">{currentVolume}</span>
                <span className="text-sm font-semibold text-gray-400">km</span>
                {volumeDeltaPct != null && (
                  <span className={`text-xs font-semibold ml-1 ${volumeDeltaPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% vs sem. anterior
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nutrición Hoy */}
      {dashSummary.nutritionTarget && (
        <NutritionSnapshot
          data={{ kcal: dashSummary.nutritionTarget.kcal, proteinG: dashSummary.nutritionTarget.proteinG, carbsG: dashSummary.nutritionTarget.carbsG, fatG: dashSummary.nutritionTarget.fatG, label: dashSummary.nutritionTarget.label }}
          variant="compact"
        />
      )}

      <TodayLogCard initial={todayLogRaw ?? null} />

      {/* Actividad reciente */}
      {(dashSummary.recentActivity?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-3.5 pt-3.5 pb-1 flex justify-between items-center">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Actividad reciente</p>
            {dashSummary.streakDays > 0 && (
              <p className="text-[10px] text-[#f97316]">🔥 {dashSummary.streakDays} días de racha</p>
            )}
          </div>
          {dashSummary.recentActivity.slice(0, 5).map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <span className="text-[22px]">{SESSION_ICONS[a.type] ?? '🏅'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{SESSION_NAMES[a.type] ?? a.type.replace(/_/g, ' ')}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {a.durationMin ? ` · ${a.durationMin} min` : ''}
                </p>
              </div>
              {a.rpe != null && (
                <span className="text-[11px] font-semibold text-[#1e3a5f] bg-gray-100 rounded-lg px-2 py-1">RPE {a.rpe}</span>
              )}
            </div>
          ))}
          <div className="px-3.5 pb-3 pt-1">
            <Link href="/log/run" className="block bg-gray-100 rounded-[10px] py-2.5 text-center text-[13px] font-semibold text-[#1e3a5f] hover:bg-gray-200 transition-colors">
              + Registrar actividad
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

// ── Shared banner components ─────────────────────────────────────────────────

function UpsellBannerPro() {
  return (
    <Link href="/pricing" className="flex items-center gap-3 bg-[#fff7ed] border border-[rgba(234,89,9,0.3)] rounded-xl overflow-hidden px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">⚡</span>
          <p className="text-[13px] font-semibold text-[#993300]">Desbloquea Plan Pro</p>
        </div>
        <p className="text-[11px] text-[#8c4d1a] mt-0.5">Check-in · zonas · progreso</p>
      </div>
      <span className="text-xs font-semibold text-white bg-[#ea5909] px-3 py-2 rounded-lg shrink-0">Ver Pro</span>
    </Link>
  )
}

function FindCoachBanner() {
  return (
    <Link href="/find-coach" className="flex items-center gap-2.5 bg-[#1e3a5f] rounded-lg overflow-hidden pr-3.5">
      <div className="w-1 self-stretch bg-[#ea5809] shrink-0" />
      <div className="flex-1 min-w-0 py-2.5">
        <p className="text-[13px] font-semibold text-white">🎯  Encuentra tu entrenador</p>
        <p className="text-[11px] text-[#b2cce5] mt-0.5">Planes personalizados con un experto</p>
      </div>
      <span className="text-xs font-semibold text-[#ea5809] shrink-0">Ver coaches →</span>
    </Link>
  )
}
