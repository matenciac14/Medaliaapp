import Link from 'next/link'
import ProgressBar from './ui/ProgressBar'

type CheckInSummary = {
  hardestSessionRpe: number | null
  energyLevel: number | null
  weightKg: number | null
}

type Props = {
  lastCheckIn: CheckInSummary | null
  formCheckInDate: string | null
  currentVolume: number | null
  volumeDeltaPct: number | null
  completedCount: number
  totalTraining: number
  /** B2C Free variant: shows session stats instead of check-in */
  variant?: 'default' | 'free'
  weekSessionCount?: number
  weekSessionTarget?: number
  weekSessionDelta?: number | null
  avgKcalPerDay?: number | null
}

export default function WeeklySummaryCard({
  lastCheckIn, formCheckInDate, currentVolume, volumeDeltaPct, completedCount, totalTraining,
  variant = 'default', weekSessionCount = 0, weekSessionTarget = 4, weekSessionDelta, avgKcalPerDay,
}: Props) {
  const isFree = variant === 'free'
  if (!isFree && !lastCheckIn && currentVolume == null) return null

  return (
    <section>
      <div className={`grid gap-3 ${isFree ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>

        {/* Card 1: Check-in (default) or Sessions (free) */}
        {isFree ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 relative">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Sesiones esta semana</p>
              <span className="text-[8px] font-bold text-gray-400 uppercase">✓ datos de tu log</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xl font-black text-[#1e3a5f] leading-none">{weekSessionCount}</p>
                <p className="text-[10px] text-gray-500 mt-1">completadas</p>
              </div>
              <div>
                <p className="text-xl font-black text-[#22c55e] leading-none">
                  {weekSessionDelta != null ? `${weekSessionDelta >= 0 ? '↑' : '↓'} ${Math.abs(weekSessionDelta)}` : '—'}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">vs. sem. ant.</p>
              </div>
              <div>
                <p className="text-xl font-black text-[#1e3a5f] leading-none">
                  {avgKcalPerDay != null ? avgKcalPerDay.toLocaleString() : '—'}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">kcal/dia</p>
              </div>
            </div>
          </div>
        ) : lastCheckIn ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Ultimo Check-in</p>
              {formCheckInDate && <p className="text-[10px] text-gray-400">{formCheckInDate}</p>}
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
        ) : null}

        {/* Card 2: Carga Semanal */}
        {isFree ? (
          weekSessionCount > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 relative">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Sesiones Semana</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-black text-[#1e3a5f]">{weekSessionCount}</span>
                <span className="text-sm text-gray-400">ses.</span>
                {weekSessionDelta != null && (
                  <span className={`text-xs font-semibold ${weekSessionDelta >= 0 ? 'text-[#22c55e]' : 'text-red-500'}`}>
                    {weekSessionDelta >= 0 ? '↑' : '↓'} {Math.abs(weekSessionDelta)} {weekSessionDelta >= 0 ? 'más' : 'menos'} que semana anterior
                  </span>
                )}
              </div>
              <ProgressBar pct={Math.round((weekSessionCount / Math.max(weekSessionTarget, 1)) * 100)} className="mt-3" />
              <p className="text-[10px] text-gray-400 mt-1">
                {weekSessionCount}/{weekSessionTarget} del objetivo semanal
              </p>
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Carga Semanal</p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-black text-[#1e3a5f]">{currentVolume ?? 0} km</span>
              {volumeDeltaPct != null && (
                <span className={`text-xs font-semibold ${volumeDeltaPct >= 0 ? 'text-[#22c55e]' : 'text-red-500'}`}>
                  {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% vs semana anterior
                </span>
              )}
            </div>
            <ProgressBar pct={Math.round((completedCount / Math.max(totalTraining, 1)) * 100)} className="mt-3" />
            <p className="text-[10px] text-gray-400 mt-1">
              {Math.round((completedCount / Math.max(totalTraining, 1)) * 100)}% del objetivo semanal
            </p>
          </div>
        )}

      </div>
    </section>
  )
}
