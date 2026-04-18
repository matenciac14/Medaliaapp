import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'

export default async function AdminCoachesPage() {
  const coaches = await prisma.user.findMany({
    where: { role: 'COACH' },
    include: {
      coachOf: {
        include: {
          athlete: {
            select: { id: true, name: true, email: true, config: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Coaches ({coaches.length})
      </h1>

      <div className="space-y-4">
        {coaches.map((coach) => (
          <details
            key={coach.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
          >
            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 list-none">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
                  {(coach.name ?? 'C')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {coach.name ?? '—'}
                  </p>
                  <p className="text-sm text-gray-500">{coach.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  {coach.coachOf.length} atleta
                  {coach.coachOf.length !== 1 ? 's' : ''}
                </span>
                <span className="text-gray-400">
                  Desde {new Date(coach.createdAt).toLocaleDateString('es-CO')}
                </span>
                <span className="text-gray-400 text-lg">▾</span>
              </div>
            </summary>

            {coach.coachOf.length > 0 ? (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {coach.coachOf.map(({ athlete }) => {
                  const config = parseUserConfig(athlete.config)
                  const activeFeatures = Object.entries(config.features)
                    .filter(([, enabled]) => enabled)
                    .map(([key]) => key)

                  return (
                    <div
                      key={athlete.id}
                      className="px-6 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {athlete.name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500">{athlete.email}</p>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {activeFeatures.length > 0 ? (
                          activeFeatures.map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                            >
                              {f}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">
                            sin features
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="border-t border-gray-100 px-6 py-4 text-sm text-gray-400">
                Sin atletas asignados aún.
              </div>
            )}
          </details>
        ))}

        {coaches.length === 0 && (
          <p className="text-gray-500 text-sm">No hay coaches registrados.</p>
        )}
      </div>
    </div>
  )
}
