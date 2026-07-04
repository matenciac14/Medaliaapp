import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import { buildAthleteAlert, buildCoachAlert, type OperationalAlert } from '@/domain/admin/alerts'

export default async function AdminAlertsPage() {
  const now = new Date()

  const [pendingAthletes, coaches] = await Promise.all([
    // Atletas B2B: onboarding completado pero sin features activadas (esperando al coach)
    prisma.user.findMany({
      where: {
        role: 'ATHLETE',
        onboardingCompleted: true,
        featurePlan: false,
        featureLog: false,  // excluye atletas FREE (featureLog:true, featurePlan:false)
      },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // Coaches registrados con sus atletas activos
    prisma.user.findMany({
      where: { role: 'COACH' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        coachOf: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const alerts: OperationalAlert[] = []

  for (const athlete of pendingAthletes) {
    const alert = buildAthleteAlert(athlete, now)
    if (alert) alerts.push(alert)
  }

  for (const coach of coaches) {
    const alert = buildCoachAlert(coach, coach.coachOf.length, now)
    if (alert) alerts.push(alert)
  }

  // Ordenar: high primero, luego por tiempo de espera desc
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1
    const aTime = a.type === 'athlete_pending' ? a.hoursWaiting : a.daysWithoutAthletes * 24
    const bTime = b.type === 'athlete_pending' ? b.hoursWaiting : b.daysWithoutAthletes * 24
    return bTime - aTime
  })

  const highCount   = alerts.filter((a) => a.severity === 'high').length
  const mediumCount = alerts.filter((a) => a.severity === 'medium').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Alertas operativas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Situaciones que requieren intervención manual del equipo Medaliq
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total alertas</p>
          <p className="text-3xl font-extrabold text-gray-900">{alerts.length}</p>
        </div>
        <div className={`border rounded-xl p-5 ${highCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Alta prioridad</p>
          <p className={`text-3xl font-extrabold ${highCount > 0 ? 'text-red-600' : 'text-gray-300'}`}>
            {highCount}
          </p>
        </div>
        <div className={`border rounded-xl p-5 ${mediumCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Media prioridad</p>
          <p className={`text-3xl font-extrabold ${mediumCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
            {mediumCount}
          </p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-gray-700">Sin alertas activas</p>
          <p className="text-sm text-gray-400 mt-1">Todo está en orden — revisa mañana.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">
              {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} activa{alerts.length !== 1 ? 's' : ''}
            </h2>
          </div>

          <ul className="divide-y divide-gray-100">
            {alerts.map((alert) => (
              <li key={`${alert.type}-${alert.userId}`} className="px-6 py-4 flex items-start gap-4">
                {/* Severidad */}
                <span
                  className={`shrink-0 w-2 h-2 rounded-full mt-2 ${
                    alert.severity === 'high' ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                />

                <div className="flex-1 min-w-0">
                  {alert.type === 'athlete_pending' ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Atleta pendiente
                        </span>
                        <span className={`text-xs font-semibold ${alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`}>
                          {alert.hoursWaiting}h esperando activación
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1">{alert.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{alert.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Registrado el {new Date(alert.createdAt).toLocaleDateString('es-CO', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Coach sin atletas
                        </span>
                        <span className={`text-xs font-semibold ${alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`}>
                          {alert.daysWithoutAthletes} días sin asesorados
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1">{alert.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{alert.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Registrado el {new Date(alert.createdAt).toLocaleDateString('es-CO', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </>
                  )}
                </div>

                <Link
                  href={`/admin/users/${alert.userId}`}
                  className="shrink-0 text-xs text-orange-600 hover:underline"
                >
                  Ver perfil →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 text-center">
        Atletas: alerta si llevan más de 48h esperando activación por el coach.<br />
        Coaches: alerta si llevan más de 7 días registrados sin atletas activos.
      </p>
    </div>
  )
}
