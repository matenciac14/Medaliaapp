import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import { ChangeRoleButton } from './_components/ChangeRoleButton'

const ROLE_BADGE: Record<string, string> = {
  ATHLETE: 'bg-blue-100 text-blue-700',
  COACH: 'bg-orange-100 text-orange-700',
  ADMIN: 'bg-red-100 text-red-700',
}

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      config: true,
      _count: { select: { trainingPlans: true, checkIns: true } },
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Usuarios ({users.length})
      </h1>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Check-ins</th>
              <th className="px-4 py-3 text-left">Registrado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const config = parseUserConfig(u.config)
              const hasActivePlan = config.plan.activePlanId !== null

              return (
                <>
                  <tr key={u.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasActivePlan ? '✅' : '✗'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {u._count.checkIns}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:underline">
                            Ver config
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-w-xs max-h-48">
                            {JSON.stringify(config, null, 2)}
                          </pre>
                        </details>
                        <ChangeRoleButton userId={u.id} currentRole={u.role} />
                      </div>
                    </td>
                  </tr>
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
