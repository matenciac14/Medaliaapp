import { prisma } from '@/lib/db/prisma'

interface StatCardProps {
  label: string
  value: number
  icon: string
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold" style={{ color: '#1e3a5f' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

export default async function AdminOverviewPage() {
  const [
    totalUsers,
    totalCoaches,
    totalAthletes,
    totalPlans,
    totalCheckIns,
    newUsersThisWeek,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'COACH' } }),
    prisma.user.count({ where: { role: 'ATHLETE' } }),
    prisma.trainingPlan.count({ where: { status: 'ACTIVE' } }),
    prisma.weeklyCheckIn.count(),
    prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  const ROLE_BADGE: Record<string, string> = {
    ATHLETE: 'bg-blue-100 text-blue-700',
    COACH: 'bg-orange-100 text-orange-700',
    ADMIN: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <StatCard label="Usuarios totales" value={totalUsers} icon="👥" />
        <StatCard label="Coaches" value={totalCoaches} icon="🏋️" />
        <StatCard label="Atletas" value={totalAthletes} icon="🏃" />
        <StatCard label="Planes activos" value={totalPlans} icon="📋" />
        <StatCard label="Check-ins" value={totalCheckIns} icon="✅" />
        <StatCard label="Nuevos esta semana" value={newUsersThisWeek} icon="🆕" />
      </div>

      {/* Últimos 5 usuarios */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Últimos registros</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 text-left">Nombre</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Rol</th>
              <th className="px-6 py-3 text-left">Registrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">
                  {u.name ?? '—'}
                </td>
                <td className="px-6 py-3 text-gray-600">{u.email}</td>
                <td className="px-6 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
