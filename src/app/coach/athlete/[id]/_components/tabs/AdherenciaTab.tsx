'use client'

type AdherenceWeek = {
  weekStart: string
  weekLabel: string
  completed: number
  planned: number | null
  pct: number | null
}

type GymVolume = { thisWeekKg: number; lastWeekKg: number; deltaPct: number | null; alert: boolean }

interface AdherenciaTabProps {
  gymVolume: GymVolume | null
  gymAdherenceLoading: boolean
  gymAdherenceLoaded: boolean
  gymAdherence: AdherenceWeek[]
  runningAdherence: AdherenceWeek[]
  runningAdherenceLoading: boolean
  runningAdherenceLoaded: boolean
}

function AdherenceGrid({ weeks }: { weeks: AdherenceWeek[] }) {
  const totalCompleted = weeks.reduce((s, w) => s + w.completed, 0)
  const totalPlanned = weeks.reduce((s, w) => s + (w.planned ?? 0), 0)
  const avgPct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : null
  const overallColor = avgPct === null ? '#9ca3af' : avgPct >= 80 ? '#16a34a' : avgPct >= 60 ? '#d97706' : '#dc2626'

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {weeks.map((week) => {
          const pct = week.pct
          const color = pct === null ? 'gray' : pct >= 80 ? 'green' : pct >= 60 ? 'amber' : 'red'
          const colorMap = {
            green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', badge: 'bg-green-100 text-green-700' },
            amber: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', badge: 'bg-amber-100 text-amber-700' },
            red:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: 'bg-red-100 text-red-700' },
            gray:  { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', badge: 'bg-gray-100 text-gray-500' },
          }
          const c = colorMap[color]
          return (
            <div
              key={week.weekStart}
              className="rounded-xl border p-4 flex flex-col gap-2"
              style={{ backgroundColor: c.bg, borderColor: c.border }}
            >
              <p className="text-xs font-medium text-gray-500 capitalize">{week.weekLabel}</p>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold" style={{ color: c.text }}>{week.completed}</span>
                {week.planned != null && (
                  <span className="text-sm text-gray-400 mb-0.5">/ {week.planned}</span>
                )}
              </div>
              {pct !== null ? (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${c.badge}`}>{pct}%</span>
              ) : (
                <span className="text-xs text-gray-400">Sin meta</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Últimas {weeks.length} semanas</p>
          <span className="text-sm font-bold" style={{ color: overallColor }}>
            {totalCompleted}{totalPlanned > 0 ? ` / ${totalPlanned}` : ''} sesiones
            {avgPct !== null && ` · ${avgPct}%`}
          </span>
        </div>
        {avgPct !== null && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(avgPct, 100)}%`, backgroundColor: overallColor }}
            />
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          {avgPct === null
            ? 'Sin datos suficientes'
            : avgPct >= 80
            ? '🟢 Consistencia excelente — mantener la carga'
            : avgPct >= 60
            ? '🟡 Consistencia media — revisar disponibilidad del atleta'
            : '🔴 Consistencia baja — considerar reducir días o ajustar el plan'}
        </p>
      </div>
    </>
  )
}

export default function AdherenciaTab({
  gymVolume,
  gymAdherenceLoading,
  gymAdherenceLoaded,
  gymAdherence,
  runningAdherence,
  runningAdherenceLoading,
  runningAdherenceLoaded,
}: AdherenciaTabProps) {
  const hasGym = gymAdherence.length > 0
  const hasRunning = runningAdherence.length > 0
  const nothingLoaded = gymAdherenceLoaded && runningAdherenceLoaded && !hasGym && !hasRunning

  return (
    <div className="space-y-5">

      {(gymAdherenceLoading || runningAdherenceLoading) && (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando adherencia...</div>
      )}

      {nothingLoaded && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin datos de adherencia</h2>
          <p className="text-gray-400 text-sm">El atleta necesita tener una rutina asignada o un plan activo</p>
        </div>
      )}

      {/* Running — adherencia al plan de entrenamiento */}
      {!runningAdherenceLoading && hasRunning && (
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">🏃 Adherencia al plan de running</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sesiones completadas vs planificadas — por semana del plan</p>
          </div>
          <AdherenceGrid weeks={runningAdherence} />
        </div>
      )}

      {/* Gym — adherencia + carga semanal */}
      {!gymAdherenceLoading && hasGym && (
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">🏋️ Adherencia al gym</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sesiones completadas vs planificadas — últimas 4 semanas</p>
          </div>

          {gymVolume && (gymVolume.thisWeekKg > 0 || gymVolume.lastWeekKg > 0) && (
            <div className={`rounded-xl border p-4 ${gymVolume.alert ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Carga esta semana</p>
                  <p className={`text-2xl font-extrabold ${gymVolume.alert ? 'text-red-600' : 'text-gray-900'}`}>
                    {gymVolume.thisWeekKg.toLocaleString('es-CO')} kg
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Semana anterior: {gymVolume.lastWeekKg.toLocaleString('es-CO')} kg
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {gymVolume.deltaPct !== null && (
                    <p className={`text-lg font-bold ${gymVolume.deltaPct > 0 ? (gymVolume.alert ? 'text-red-600' : 'text-green-600') : 'text-blue-600'}`}>
                      {gymVolume.deltaPct > 0 ? '+' : ''}{gymVolume.deltaPct}%
                    </p>
                  )}
                  {gymVolume.alert && (
                    <p className="text-xs text-red-500 font-semibold mt-0.5">⚠ +20% vs sem. ant.</p>
                  )}
                  {!gymVolume.alert && gymVolume.deltaPct !== null && (
                    <p className="text-xs text-gray-400 mt-0.5">vs sem. anterior</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <AdherenceGrid weeks={gymAdherence} />
        </div>
      )}
    </div>
  )
}
