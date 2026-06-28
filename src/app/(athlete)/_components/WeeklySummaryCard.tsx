import Link from 'next/link'

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
}

export default function WeeklySummaryCard({
  lastCheckIn, formCheckInDate, currentVolume, volumeDeltaPct, completedCount, totalTraining,
}: Props) {
  if (!lastCheckIn && currentVolume == null) return null

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resumen Rápido</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {lastCheckIn && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Último Check-in</p>
              {formCheckInDate && <p className="text-[10px] text-gray-400">{formCheckInDate}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {lastCheckIn.hardestSessionRpe != null && (
                <div className="bg-orange-50 rounded-xl px-3 py-2">
                  <p className="text-base font-semibold text-[#f97316] leading-none">{lastCheckIn.hardestSessionRpe}/10</p>
                  <p className="text-[10px] text-gray-500 mt-1">RPE</p>
                </div>
              )}
              {lastCheckIn.energyLevel != null && (
                <div className="bg-green-50 rounded-xl px-3 py-2">
                  <p className="text-base font-semibold text-[#22c55e] leading-none">{lastCheckIn.energyLevel}/10 ★</p>
                  <p className="text-[10px] text-gray-500 mt-1">Energía</p>
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

        {currentVolume != null && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Carga Semanal</p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-black text-[#1e3a5f]">{currentVolume} km</span>
              {volumeDeltaPct != null && (
                <span className={`text-xs font-semibold ${volumeDeltaPct >= 0 ? 'text-[#22c55e]' : 'text-red-500'}`}>
                  {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% vs sem. anterior
                </span>
              )}
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-[#f97316] rounded-full"
                style={{ width: `${Math.min(100, Math.round((completedCount / Math.max(totalTraining, 1)) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {Math.round((completedCount / Math.max(totalTraining, 1)) * 100)}% del objetivo semanal
            </p>
          </div>
        )}

      </div>
    </section>
  )
}
