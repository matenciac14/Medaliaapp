import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'

const ROLE_BADGE: Record<string, string> = {
  ATHLETE: 'bg-blue-100 text-blue-700',
  COACH:   'bg-orange-100 text-orange-700',
  ADMIN:   'bg-red-100 text-red-700',
}

export default async function AdminOverviewPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    totalCoaches,
    totalAthletes,
    newThisWeek,
    newThisMonth,
    completedOnboarding,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'COACH' } }),
    prisma.user.count({ where: { role: 'ATHLETE' } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.findMany({ select: { config: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, role: true, createdAt: true, config: true },
    }),
  ])

  const onboardingDone = completedOnboarding.filter((u) => {
    const cfg = parseUserConfig(u.config)
    return cfg.onboarding.completed
  }).length

  const stats = [
    { label: 'Usuarios totales',       value: totalUsers,       icon: '👥', color: '#1e3a5f' },
    { label: 'Atletas',                value: totalAthletes,    icon: '🏃', color: '#1e3a5f' },
    { label: 'Coaches',                value: totalCoaches,     icon: '🏋️', color: '#f97316' },
    { label: 'Nuevos esta semana',     value: newThisWeek,      icon: '📈', color: '#16a34a' },
    { label: 'Nuevos este mes',        value: newThisMonth,     icon: '📅', color: '#16a34a' },
    { label: 'Onboarding completado',  value: onboardingDone,   icon: '✅', color: '#7c3aed' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Métricas generales de la plataforma Medaliq</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {s.label}
              </span>
            </div>
            <p className="text-4xl font-extrabold" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Últimos registros */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Últimos registros</h2>
          <a href="/admin/users" className="text-sm text-orange-500 hover:underline">
            Ver todos →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Rol</th>
                <th className="px-6 py-3 text-left">Onboarding</th>
                <th className="px-6 py-3 text-left">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentUsers.map((u) => {
                const cfg = parseUserConfig(u.config)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{u.name ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-600">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {cfg.onboarding.completed
                        ? <span className="text-green-600 text-xs font-medium">Completado</span>
                        : <span className="text-gray-400 text-xs">Pendiente</span>
                      }
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
