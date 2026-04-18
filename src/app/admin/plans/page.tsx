import { prisma } from '@/lib/db/prisma'

export default async function AdminPlansPage() {
  const plans = await prisma.trainingPlan.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Planes activos ({plans.length})
      </h1>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Atleta</th>
              <th className="px-4 py-3 text-left">Semanas</th>
              <th className="px-4 py-3 text-left">Inicio</th>
              <th className="px-4 py-3 text-left">Fin</th>
              <th className="px-4 py-3 text-left">Fuente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3">
                  <p className="text-gray-800">{p.user.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{p.user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.totalWeeks}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(p.startDate).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(p.endDate).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                    {p.generatedBy}
                  </span>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No hay planes activos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
