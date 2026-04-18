import { prisma } from '@/lib/db/prisma'

export default async function AdminMetricsPage() {
  const [checkIns, sessionLogs, plansByStatus] = await Promise.all([
    prisma.weeklyCheckIn.count(),
    prisma.sessionLog.count(),
    prisma.trainingPlan.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Métricas</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Check-ins totales</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#1e3a5f' }}>
            {checkIns}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Sesiones registradas</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#1e3a5f' }}>
            {sessionLogs}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Planes por estado</h2>
        <div className="space-y-2">
          {plansByStatus.map((row) => (
            <div key={row.status} className="flex justify-between text-sm">
              <span className="text-gray-600">{row.status}</span>
              <span className="font-semibold text-gray-900">
                {row._count._all}
              </span>
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
