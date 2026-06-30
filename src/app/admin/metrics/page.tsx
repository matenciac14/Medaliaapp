import { prisma } from '@/lib/db/prisma'
import { computeWAU } from '@/domain/admin/wau'

export default async function AdminMetricsPage() {
  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
  const fiftyFiveDays = new Date(Date.now() - 55 * 24 * 60 * 60 * 1000) // ~8 semanas

  const [
    checkInsTotal,
    checkInsThisWeek,
    sessionLogsTotal,
    sessionLogsThisWeek,
    activePlans,
    plansByStatus,
    coachesWithAthletes,
    onboardingCompleted,
    totalUsers,
    // Eventos de actividad para WAU
    sessionEvents,
    checkInEvents,
  ] = await Promise.all([
    prisma.weeklyCheckIn.count(),
    prisma.weeklyCheckIn.count({ where: { recordedAt: { gte: sevenDaysAgo } } }),
    prisma.sessionLog.count(),
    prisma.sessionLog.count({ where: { completedAt: { gte: sevenDaysAgo } } }),
    prisma.trainingPlan.count({ where: { status: 'ACTIVE' } }),
    prisma.trainingPlan.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({
      where: { role: 'COACH', coachOf: { some: { status: 'ACTIVE' } } },
    }),
    prisma.user.count({ where: { onboardingCompleted: true } }),
    prisma.user.count(),
    // SessionLog — últimas 8 semanas
    prisma.sessionLog.findMany({
      where: { completedAt: { gte: fiftyFiveDays } },
      select: { userId: true, completedAt: true },
    }),
    // WeeklyCheckIn — últimas 8 semanas
    prisma.weeklyCheckIn.findMany({
      where: { recordedAt: { gte: fiftyFiveDays } },
      select: { userId: true, recordedAt: true },
    }),
  ])

  const onboardingRate = totalUsers > 0 ? Math.round((onboardingCompleted / totalUsers) * 100) : 0

  // Merge events para WAU (SessionLog + CheckIn → un evento por actividad)
  const allEvents = [
    ...sessionEvents.map((e) => ({ userId: e.userId, date: e.completedAt })),
    ...checkInEvents.map((e) => ({ userId: e.userId, date: e.recordedAt })),
  ]
  const wauBuckets = computeWAU(allEvents, 8)
  const wauMax = Math.max(...wauBuckets.map((b) => b.count), 1)
  const wauCurrent = wauBuckets.at(-1)?.count ?? 0
  const wauPrev    = wauBuckets.at(-2)?.count ?? 0
  const wauDelta   = wauCurrent - wauPrev

  const kpis = [
    { label: 'Check-ins totales',     value: checkInsTotal,       sub: `+${checkInsThisWeek} esta semana`,  color: '#1e3a5f' },
    { label: 'Sesiones registradas',  value: sessionLogsTotal,    sub: `+${sessionLogsThisWeek} esta semana`, color: '#1e3a5f' },
    { label: 'Planes activos',        value: activePlans,         sub: 'atletas con plan en curso',          color: '#7c3aed' },
    { label: 'Coaches con atletas',   value: coachesWithAthletes, sub: 'al menos 1 asesorado activo',        color: '#f97316' },
    { label: 'Onboarding completado', value: onboardingCompleted, sub: `${onboardingRate}% del total`,       color: '#16a34a' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
        <p className="text-sm text-gray-500 mt-1">Actividad y uso de la plataforma</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{k.label}</p>
            <p className="text-4xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* WAU — Weekly Active Users */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-semibold text-gray-800">WAU — Usuarios activos por semana</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Atletas únicos con al menos 1 sesión registrada o check-in en la semana
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-gray-900">{wauCurrent}</p>
            <p className={`text-xs font-semibold mt-0.5 ${wauDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {wauDelta >= 0 ? '+' : ''}{wauDelta} vs semana anterior
            </p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-2 h-32">
          {wauBuckets.map((bucket, i) => {
            const isLast   = i === wauBuckets.length - 1
            const heightPct = wauMax > 0 ? Math.max((bucket.count / wauMax) * 100, bucket.count > 0 ? 4 : 0) : 0
            return (
              <div key={bucket.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-700">
                  {bucket.count > 0 ? bucket.count : ''}
                </span>
                <div className="w-full flex items-end" style={{ height: '96px' }}>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: isLast ? '#1e3a5f' : '#bfdbfe',
                      minHeight: bucket.count > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span className={`text-xs ${isLast ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                  {bucket.label}
                </span>
              </div>
            )
          })}
        </div>

        {wauCurrent === 0 && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Sin actividad registrada esta semana aún.
          </p>
        )}
      </div>

      {/* Planes por estado */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Planes por estado</h2>
        <div className="space-y-2">
          {plansByStatus.map((row) => (
            <div key={row.status} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {({ ACTIVE: 'Activo', INACTIVE: 'Inactivo', COMPLETED: 'Completado', ABANDONED: 'Abandonado' } as Record<string, string>)[row.status] ?? row.status}
              </span>
              <span className="font-semibold text-gray-900">{row._count._all}</span>
            </div>
          ))}
          {plansByStatus.length === 0 && (
            <p className="text-sm text-gray-400">Sin datos aún.</p>
          )}
        </div>
      </div>
    </div>
  )
}
