import { prisma } from '@/lib/db/prisma'

export default async function AdminCoachesPage() {
  const coaches = await prisma.user.findMany({
    where: { role: 'COACH' },
    include: {
      coachOf: {
        include: {
          athlete: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coaches ({coaches.length})</h1>
        <p className="text-sm text-gray-500 mt-1">Entrenadores registrados y sus atletas asignados</p>
      </div>

      {coaches.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
          No hay coaches registrados aún.
        </div>
      )}

      <div className="space-y-4">
        {coaches.map((coach) => (
          <div key={coach.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Coach header */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: '#f97316' }}>
                  {(coach.name ?? 'C')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{coach.name ?? '—'}</p>
                  <p className="text-sm text-gray-500">{coach.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-800">{coach.coachOf.length}</p>
                  <p className="text-xs text-gray-400">atletas</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Desde</p>
                  <p className="text-xs font-medium">{new Date(coach.createdAt).toLocaleDateString('es-CO')}</p>
                </div>
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
                    {coach.coachOf.map(({ athlete }) => (
                      <tr key={athlete.id} className="hover:bg-gray-50">
                        <td className="px-6 py-2 font-medium text-gray-800">{athlete.name ?? '—'}</td>
                        <td className="px-6 py-2 text-gray-500">{athlete.email}</td>
                        <td className="px-6 py-2 text-gray-400 text-xs">
                          {new Date(athlete.createdAt).toLocaleDateString('es-CO')}
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
        ))}
      </div>
    </div>
  )
}
