import { prisma } from '@/lib/db/prisma'

export default async function AdminMetricsPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

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
  ] = await Promise.all([
    prisma.weeklyCheckIn.count(),
    prisma.weeklyCheckIn.count({ where: { recordedAt: { gte: sevenDaysAgo } } }),
    prisma.sessionLog.count(),
    prisma.sessionLog.count({ where: { completedAt: { gte: sevenDaysAgo } } }),
    prisma.trainingPlan.count({ where: { status: 'ACTIVE' } }),
    prisma.trainingPlan.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({
      where: { role: 'COACH', coachOf: { some: {} } },
    }),
    prisma.user.count({ where: { onboardingCompleted: true } }),
    prisma.user.count(),
  ])

  const onboardingRate = totalUsers > 0 ? Math.round((onboardingCompleted / totalUsers) * 100) : 0

  const kpis = [
    { label: 'Check-ins totales',        value: checkInsTotal,       sub: `+${checkInsThisWeek} esta semana`,  color: '#1e3a5f' },
    { label: 'Sesiones registradas',      value: sessionLogsTotal,    sub: `+${sessionLogsThisWeek} esta semana`, color: '#1e3a5f' },
    { label: 'Planes activos',            value: activePlans,         sub: 'atletas con plan en curso',          color: '#7c3aed' },
    { label: 'Coaches con atletas',       value: coachesWithAthletes, sub: 'al menos 1 asesorado activo',        color: '#f97316' },
    { label: 'Onboarding completado',     value: onboardingCompleted, sub: `${onboardingRate}% del total`,       color: '#16a34a' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
        <p className="text-sm text-gray-500 mt-1">Actividad y uso de la plataforma</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{k.label}</p>
            <p className="text-4xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Planes por estado</h2>
        <div className="space-y-2">
          {plansByStatus.map((row) => (
            <div key={row.status} className="flex justify-between text-sm">
              <span className="text-gray-600">{row.status}</span>
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
