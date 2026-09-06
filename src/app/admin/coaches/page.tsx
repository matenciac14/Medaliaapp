import { prisma } from '@/lib/db/prisma'
import { computeCoachActivity } from '@/domain/admin/coach_activity'
import { CoachTierDropdown } from './_components/CoachTierDropdown'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default async function AdminCoachesPage() {
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS)

  const [coaches, recentMessages, recentPayments] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'COACH' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        identification: true, phoneWa: true,
        subscription: { select: { coachTier: true } },
        coachOf: {
          select: {
            createdAt: true,
            athlete: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.message.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { fromId: true },
    }),
    prisma.payment.findMany({
      where: { updatedAt: { gte: sevenDaysAgo } },
      select: { coachId: true },
    }),
  ])

  const allCoachIds = new Set(coaches.map((c) => c.id))
  const activity = computeCoachActivity(
    recentMessages.map((m) => m.fromId).filter((id): id is string => id !== null),
    recentPayments.map((p) => p.coachId),
    allCoachIds,
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coaches ({coaches.length})</h1>
        <p className="text-sm text-gray-500 mt-1">Entrenadores registrados y sus atletas asignados</p>
      </div>

      {/* Actividad esta semana */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total coaches</p>
          <p className="text-3xl font-extrabold text-gray-900">{activity.totalCount}</p>
        </div>
        <div className={`border rounded-xl p-5 ${activity.activeCount > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Activos esta semana</p>
          <p className={`text-3xl font-extrabold ${activity.activeCount > 0 ? 'text-green-600' : 'text-gray-300'}`}>
            {activity.activeCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">mensaje o pago en 7 días</p>
        </div>
        <div className={`border rounded-xl p-5 ${activity.inactiveCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Sin actividad</p>
          <p className={`text-3xl font-extrabold ${activity.inactiveCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
            {activity.inactiveCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">sin registrar acción esta semana</p>
        </div>
      </div>

      {coaches.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
          No hay coaches registrados aún.
        </div>
      )}

      <div className="space-y-4">
        {coaches.map((coach) => {
          const isActive = activity.activeIds.has(coach.id)
          return (
            <div key={coach.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Coach header */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ backgroundColor: '#ea580c' }}>
                    {(coach.name ?? 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{coach.name ?? '—'}</p>
                      {isActive ? (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Activo esta semana
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">
                          Sin actividad
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{coach.email}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span title="Identificación (solo admin)">
                        🪪 {coach.identification ?? <span className="text-red-400 font-medium">Sin cédula</span>}
                      </span>
                      <span title="WhatsApp (solo admin)">
                        📱 {coach.phoneWa ?? <span className="text-red-400 font-medium">Sin WhatsApp</span>}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500 shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-800">{coach.coachOf.length}</p>
                    <p className="text-xs text-gray-400">atletas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Desde</p>
                    <p className="text-xs font-medium">{new Date(coach.createdAt).toLocaleDateString('es-CO')}</p>
                  </div>
                  <CoachTierDropdown
                    coachId={coach.id}
                    initialTier={coach.subscription?.coachTier ?? 'STARTER'}
                  />
                </div>
              </div>

              {/* Athlete list */}
              {coach.coachOf.length > 0 && (
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-6 py-2 text-left">Atleta</th>
                        <th className="px-6 py-2 text-left">Email</th>
                        <th className="px-6 py-2 text-left">Vinculado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coach.coachOf.map(({ athlete, createdAt: linkedAt }) => (
                        <tr key={athlete.id} className="hover:bg-gray-50">
                          <td className="px-6 py-2 font-medium text-gray-800">{athlete.name ?? '—'}</td>
                          <td className="px-6 py-2 text-gray-500">{athlete.email}</td>
                          <td className="px-6 py-2 text-gray-400 text-xs">
                            {new Date(linkedAt).toLocaleDateString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {coach.coachOf.length === 0 && (
                <div className="border-t border-gray-100 px-6 py-3 text-sm text-gray-400">
                  Sin atletas asignados aún.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
