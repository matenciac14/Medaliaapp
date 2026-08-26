import Link from 'next/link'
import type { DashboardMode } from '../_lib/get-dashboard-data'
import type { DashboardSummary } from '@/domain/dashboard/get-dashboard-summary.use-case'
import { PHASE_COLORS } from '../_lib/dashboard-helpers'
import { jsToOurDow } from '@/lib/core/date-utils'
import ProgressBar from '../../_components/ui/ProgressBar'
import NutritionSnapshot from '../../_components/ui/NutritionSnapshot'

type Props = {
  dashboardMode: DashboardMode
  // Card 1 data
  weekSessionCount: number
  weekSessionTarget: number
  streakDays: number
  assignedWorkoutName: string | null
  isRecomp: boolean
  currentWeight: number | null
  targetWeight: number | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
  raceDays: number | null
  raceDate: string | undefined
  planData: { name: string; totalWeeks: number; currentWeek: number; phase: string }
  activePlanId: string | null
  phaseDisplay: string
  // Card 2 (Tu Peso) — shared
  // Card 3
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: { energyLevel: number | null; hardestSessionRpe: number | null; sleepHours: number | null; weightKg: number | null } | null
  formCheckInDate: string | null
  dashSummary: DashboardSummary
  nutritionPlan: { targetKcalHard: number } | null
}

export default function HeroCardsRow(props: Props) {
  const {
    dashboardMode, weekSessionCount, weekSessionTarget, streakDays,
    assignedWorkoutName, isRecomp, currentWeight, targetWeight,
    weeklyWeightChange, weightProgressPct, raceDays, raceDate,
    planData, activePlanId, phaseDisplay,
    formStatus, formMessage, lastCheckIn, formCheckInDate, dashSummary, nutritionPlan,
  } = props
  const todayDow = jsToOurDow(new Date().getDay())

  return (
    <div className="hidden sm:grid sm:grid-cols-3 gap-3">
      {/* Card 1 */}
      {dashboardMode === 'FREE' ? (
        <FreeActivityCard weekSessionCount={weekSessionCount} weekSessionTarget={weekSessionTarget} streakDays={streakDays} />
      ) : dashboardMode === 'GYM' ? (
        <GymRoutineCard workoutName={assignedWorkoutName} weekSessionCount={weekSessionCount} weekSessionTarget={weekSessionTarget} todayDow={todayDow} />
      ) : isRecomp ? (
        <RecompCard currentWeight={currentWeight} targetWeight={targetWeight} weeklyWeightChange={weeklyWeightChange} weightProgressPct={weightProgressPct} />
      ) : (
        <RaceCard raceDays={raceDays} raceDate={raceDate} planData={planData} activePlanId={activePlanId} phaseDisplay={phaseDisplay} />
      )}

      {/* Card 2: Tu Peso */}
      <WeightCard currentWeight={currentWeight} targetWeight={targetWeight} weeklyWeightChange={weeklyWeightChange} weightProgressPct={weightProgressPct} dashboardMode={dashboardMode} />

      {/* Card 3 */}
      {dashboardMode === 'FREE' ? (
        <FreeNutritionCard nutritionTarget={dashSummary.nutritionTarget} targetKcalHard={nutritionPlan?.targetKcalHard ?? null} />
      ) : (
        <FormStatusCard formStatus={formStatus} formMessage={formMessage} lastCheckIn={lastCheckIn} formCheckInDate={formCheckInDate} hrResting={dashSummary.metrics.hrResting} />
      )}
    </div>
  )
}

// ── Sub-components (private to this file) ─────────────────────────────────

function FreeActivityCard({ weekSessionCount, weekSessionTarget, streakDays }: { weekSessionCount: number; weekSessionTarget: number; streakDays: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex h-full">
        <div className="w-1 bg-[#ea580c] shrink-0" />
        <div className="flex-1 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">📊 TU ACTIVIDAD</p>
          {weekSessionCount > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-2xl font-black text-[#1e3a5f] leading-none">{weekSessionCount}</span>
                <span className="text-sm text-gray-400">sesiones</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-1.5">registradas · último mes</p>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-[#1e3a5f] leading-none block mb-0.5">—</span>
              <p className="text-[11px] text-gray-500 mb-1.5">Sin sesiones registradas aún</p>
            </>
          )}
          <ProgressBar pct={Math.round((weekSessionCount / Math.max(weekSessionTarget, 1)) * 100)} className="mb-1" />
          <div className="flex justify-between items-center">
            {weekSessionCount > 0 && streakDays >= 2 ? (
              <p className="text-[10px] text-[#ea580c]">Racha activa: {streakDays} días 🔥</p>
            ) : <p className="text-[10px] text-gray-400" />}
            <Link href="/log" className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">{weekSessionCount > 0 ? 'Ver log →' : 'Registrar →'}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function GymRoutineCard({ workoutName, weekSessionCount, weekSessionTarget, todayDow }: { workoutName: string | null; weekSessionCount: number; weekSessionTarget: number; todayDow: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">💪 Tu Rutina</p>
        <p className="text-sm font-bold text-[#1e3a5f] leading-tight mb-0.5">{workoutName ?? 'Rutina activa'}</p>
        <p className="text-[11px] text-gray-500 mb-1.5">{weekSessionCount} de {weekSessionTarget} días esta semana</p>
        <div className="flex items-center gap-1 mb-1.5">
          {Array.from({ length: weekSessionTarget }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < weekSessionCount ? 'bg-[#ea580c]' : 'bg-gray-100'}`} />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-gray-400">
            {weekSessionCount >= weekSessionTarget ? 'Meta semanal cumplida' : `Faltan ${weekSessionTarget - weekSessionCount}`}
          </p>
          <Link href={`/gym?selectedDow=${todayDow}`} className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">Ver rutina →</Link>
        </div>
      </div>
    </div>
  )
}

function RecompCard({ currentWeight, targetWeight, weeklyWeightChange, weightProgressPct }: { currentWeight: number | null; targetWeight: number | null; weeklyWeightChange: number | null; weightProgressPct: number | null }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">🎯 Tu Objetivo</p>
        {currentWeight && targetWeight ? (
          <>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-2xl font-black text-[#1e3a5f] leading-none">
                ~{weeklyWeightChange
                  ? Math.max(0, Math.ceil(Math.abs((currentWeight - targetWeight) / (weeklyWeightChange || 0.5)) * 7))
                  : '—'}
              </span>
              <span className="text-sm text-gray-400">días</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-1.5">
              para llegar a {targetWeight} kg
              {weeklyWeightChange ? ` · ${weeklyWeightChange > 0 ? '+' : ''}${weeklyWeightChange.toFixed(1)} kg/sem` : ''}
            </p>
            <ProgressBar pct={weightProgressPct ?? 0} color="bg-[#22c55e]" className="mb-1" />
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-gray-400">{weightProgressPct ?? 0}% completado</p>
              <Link href="/progress" className="text-[10px] font-semibold text-[#22c55e]">Ver progreso →</Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">Define tu meta de peso</p>
        )}
      </div>
    </div>
  )
}

function RaceCard({ raceDays, raceDate, planData, activePlanId, phaseDisplay }: { raceDays: number | null; raceDate: string | undefined; planData: Props['planData']; activePlanId: string | null; phaseDisplay: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">🏁 Tu Carrera</p>
        {raceDays !== null && raceDays > 0 ? (
          <>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-2xl font-black text-[#1e3a5f] leading-none">{raceDays}</span>
              <span className="text-sm text-gray-400">días</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-1.5">
              para tu {planData.name ?? 'carrera'} · {raceDate
                ? new Date(raceDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                : ''}
            </p>
            {activePlanId && (
              <>
                <ProgressBar pct={Math.round((planData.currentWeek / planData.totalWeeks) * 100)} className="mb-1" />
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-gray-400">Semana {planData.currentWeek} de {planData.totalWeeks}</p>
                  <Link href="/plan" className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">Ver plan →</Link>
                </div>
              </>
            )}
          </>
        ) : activePlanId ? (
          <>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-2xl font-black text-[#1e3a5f] leading-none">{planData.currentWeek}</span>
              <span className="text-sm text-gray-400">/ {planData.totalWeeks}</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-1.5">{planData.name}</p>
            <ProgressBar pct={Math.round((planData.currentWeek / planData.totalWeeks) * 100)} className="mb-1" />
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-gray-400">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${PHASE_COLORS[planData.phase] ?? 'bg-gray-100 text-gray-600'}`}>
                  {phaseDisplay}
                </span>
              </p>
              <Link href="/plan" className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">Ver plan →</Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 mt-2">Sin plan activo</p>
        )}
      </div>
    </div>
  )
}

function WeightCard({ currentWeight, targetWeight, weeklyWeightChange, weightProgressPct, dashboardMode }: { currentWeight: number | null; targetWeight: number | null; weeklyWeightChange: number | null; weightProgressPct: number | null; dashboardMode: DashboardMode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex h-full">
        <div className="w-1 bg-[#3b6fdd] shrink-0" />
        <div className="flex-1 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">⚖️ {targetWeight ? 'TU META DE PESO' : 'TU PESO'}</p>
          {currentWeight && targetWeight ? (
            <>
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-2xl font-black text-[#1e3a5f] leading-none">{currentWeight.toFixed(1)}</span>
                <span className="text-sm text-gray-400">kg</span>
                <span className="text-sm text-gray-300 mx-1">→</span>
                <span className="text-lg font-semibold text-[#3b6fdd]">{targetWeight} kg</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-1.5">
                {dashboardMode === 'FREE'
                  ? 'Meta configurada en tu perfil'
                  : weeklyWeightChange != null
                    ? `~${Math.max(0, Math.ceil(Math.abs((currentWeight - targetWeight) / (Math.abs(weeklyWeightChange) || 0.5))))} semanas al ritmo actual · ${weeklyWeightChange > 0 ? '+' : ''}${weeklyWeightChange.toFixed(1)} kg/sem`
                    : 'Meta configurada en tu perfil'}
              </p>
              <ProgressBar pct={weightProgressPct ?? 0} color="bg-[#3b6fdd]" className="mb-1" />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-gray-400">
                  {dashboardMode === 'FREE' ? 'Sin proyección · registra tu peso' : `${weightProgressPct ?? 0}% completado`}
                </p>
                <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd]">
                  {dashboardMode === 'FREE' ? 'Actualizar peso →' : 'Ver progreso →'}
                </Link>
              </div>
            </>
          ) : currentWeight ? (
            <>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-2xl font-black text-[#1e3a5f] leading-none">{currentWeight.toFixed(1)}</span>
                <span className="text-sm text-gray-400">kg</span>
              </div>
              <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd] mt-3 block">Define tu meta →</Link>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-[#1e3a5f] leading-none block mb-0.5">—</span>
              <p className="text-[11px] text-gray-500 mb-1.5">Sin datos de peso registrados</p>
              <ProgressBar pct={0} color="bg-gray-100" className="mb-1" />
              <div className="flex justify-end">
                <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd]">Registrar peso →</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FreeNutritionCard({ nutritionTarget, targetKcalHard }: { nutritionTarget: DashboardSummary['nutritionTarget']; targetKcalHard: number | null }) {
  return (
    <NutritionSnapshot
      data={nutritionTarget ? { kcal: nutritionTarget.kcal, proteinG: nutritionTarget.proteinG, carbsG: nutritionTarget.carbsG, fatG: nutritionTarget.fatG } : null}
      variant="card"
      targetKcalHard={targetKcalHard}
    />
  )
}

function FormStatusCard({ formStatus, formMessage, lastCheckIn, formCheckInDate, hrResting }: { formStatus: 'good' | 'moderate' | 'rest'; formMessage: string; lastCheckIn: Props['lastCheckIn']; formCheckInDate: string | null; hrResting: number | null }) {
  const bg = formStatus === 'good' ? 'bg-green-50 border-green-200' : formStatus === 'moderate' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const labelColor = formStatus === 'good' ? 'text-green-600' : formStatus === 'moderate' ? 'text-amber-600' : 'text-red-600'
  const pillBg = formStatus === 'good' ? 'bg-green-100 text-green-700' : formStatus === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  const dot = formStatus === 'good' ? '🟢' : formStatus === 'moderate' ? '🟡' : '🔴'

  return (
    <Link href="/checkin" className={`rounded-2xl border shadow-sm overflow-hidden block transition-shadow hover:shadow-md ${bg}`}>
      <div className="px-4 py-3">
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${labelColor}`}>⚡ Cómo llegas hoy</p>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-lg">{dot}</span>
          <p className="text-base font-bold text-[#1e3a5f] leading-tight">{formMessage}</p>
        </div>
        {lastCheckIn ? (
          <>
            <div className="flex gap-1.5 flex-wrap mt-2">
              {lastCheckIn.energyLevel != null && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pillBg}`}>
                  Energía {lastCheckIn.energyLevel}/5
                </span>
              )}
              {lastCheckIn.hardestSessionRpe != null && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  RPE {lastCheckIn.hardestSessionRpe}/10
                </span>
              )}
              {lastCheckIn.sleepHours != null && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Sueño {lastCheckIn.sleepHours}h
                </span>
              )}
              {hrResting != null && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  FC basal {hrResting} bpm
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Actualizar → · {formCheckInDate}</p>
          </>
        ) : (
          <p className="text-[11px] text-gray-500 mt-2">Hacer check-in →</p>
        )}
      </div>
    </Link>
  )
}
