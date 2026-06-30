import { prisma } from '@/lib/db/prisma'
import { labelForAction, describeAuditEntry, colorForAction } from '@/domain/admin/audit-log'

export default async function AdminAuditPage() {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      action: true,
      meta: true,
      createdAt: true,
      admin: { select: { id: true, name: true, email: true } },
      targetUser: { select: { id: true, name: true, email: true } },
    },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Log de actividad</h1>
        <p className="text-sm text-gray-500 mt-1">
          Últimas 200 acciones realizadas por admins en la plataforma
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-semibold text-gray-700">Sin actividad registrada</p>
          <p className="text-sm text-gray-400 mt-1">
            Las acciones de administración aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {logs.length} evento{logs.length !== 1 ? 's' : ''}
            </h2>
            <span className="text-xs text-gray-400">Mostrando últimos 200</span>
          </div>

          <ul className="divide-y divide-gray-100">
            {logs.map((log) => {
              const meta = log.meta as Record<string, unknown> | null
              const { bg, text } = colorForAction(log.action)
              const description = describeAuditEntry({
                action: log.action,
                meta,
                targetUserName: log.targetUser?.name ?? null,
              })

              return (
                <li key={log.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="shrink-0 pt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
                      {labelForAction(log.action)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400">
                        por <span className="font-medium text-gray-600">{log.admin.name ?? log.admin.email}</span>
                      </span>
                      {log.targetUser && (
                        <>
                          <span className="text-xs text-gray-300">·</span>
                          <a
                            href={`/admin/users/${log.targetUser.id}`}
                            className="text-xs text-orange-500 hover:underline"
                          >
                            {log.targetUser.email}
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <time
                    dateTime={log.createdAt.toISOString()}
                    className="shrink-0 text-xs text-gray-400 tabular-nums"
                  >
                    {new Date(log.createdAt).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
