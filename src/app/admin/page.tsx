import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'

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
    athletesWithActivePlan,
    athletesWithCheckinThisWeek,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'COACH' } }),
    prisma.user.count({ where: { role: 'ATHLETE' } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { role: 'ATHLETE', onboardingCompleted: true } }),
    prisma.user.count({
      where: {
        role: 'ATHLETE',
        trainingPlans: { some: { status: 'ACTIVE' } },
      },
    }),
    prisma.user.count({
      where: {
        role: 'ATHLETE',
        checkIns: { some: { recordedAt: { gte: sevenDaysAgo } } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, role: true, createdAt: true, onboardingCompleted: true },
    }),
  ])

  const stats = [
    { label: 'Usuarios totales',       value: totalUsers,          icon: '👥', color: '#1e3a5f' },
    { label: 'Atletas',                value: totalAthletes,       icon: '🏃', color: '#1e3a5f' },
    { label: 'Coaches',                value: totalCoaches,        icon: '🏋️', color: '#ea580c' },
    { label: 'Nuevos esta semana',     value: newThisWeek,         icon: '📈', color: '#16a34a' },
    { label: 'Nuevos este mes',        value: newThisMonth,        icon: '📅', color: '#16a34a' },
    { label: 'Onboarding completado',  value: completedOnboarding, icon: '✅', color: '#7c3aed' },
  ]

  // Funnel de activación (solo atletas)
  const funnelSteps = [
    { label: 'Registrados',        count: totalAthletes,              description: 'Atletas en la plataforma' },
    { label: 'Onboarding hecho',   count: completedOnboarding,        description: 'Completaron el perfil inicial' },
    { label: 'Plan activo',        count: athletesWithActivePlan,     description: 'Tienen plan de entrenamiento activo' },
    { label: 'Check-in esta semana', count: athletesWithCheckinThisWeek, description: 'Registraron check-in en los últimos 7 días' },
  ]

  function pct(n: number, total: number) {
    if (total === 0) return 0
    return Math.round((n / total) * 100)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resumen</h1>
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

      {/* Funnel de activación */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="mb-5">
          <h2 className="font-semibold text-gray-800">Funnel de activación</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Conversión de atletas desde registro hasta uso activo
          </p>
        </div>
        <div className="grid grid-cols-4 gap-0">
          {funnelSteps.map((step, i) => {
            const prevCount = i === 0 ? totalAthletes : funnelSteps[i - 1].count
            const convRate  = i === 0 ? 100 : pct(step.count, prevCount)
            const absRate   = pct(step.count, totalAthletes)
            const barWidth  = `${absRate}%`

            return (
              <div key={step.label} className="relative px-4 first:pl-0 last:pr-0">
                {/* Arrow connector */}
                {i > 0 && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 text-gray-300 text-lg z-10">
                    ›
                  </div>
                )}

                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                      {step.label}
                    </p>
                    <p className="text-3xl font-extrabold text-gray-900 mb-0.5">{step.count}</p>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: barWidth, backgroundColor: i === 0 ? '#1e3a5f' : convRate >= 70 ? '#16a34a' : convRate >= 40 ? '#ea580c' : '#dc2626' }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-400">{absRate}% del total</span>
                      {i > 0 && (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: convRate >= 70 ? '#16a34a' : convRate >= 40 ? '#ea580c' : '#dc2626' }}
                        >
                          {convRate}% del paso anterior
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Últimos registros */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Últimos registros</h2>
          <Link href="/admin/users" className="text-sm text-orange-600 hover:underline">
            Ver todos →
          </Link>
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
              {recentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{u.name ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {u.onboardingCompleted
                      ? <span className="text-green-600 text-xs font-medium">Completado</span>
                      : <span className="text-gray-400 text-xs">Pendiente</span>
                    }
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
    </div>
  )
}
