import { prisma } from '@/lib/db/prisma'
import { InviteCodesClient } from './_components/InviteCodesClient'
import { computeOverallConversion, computePerCoachConversion } from '@/domain/admin/invite_conversion'

export default async function AdminInviteCodesPage() {
  const now = new Date()

  const [codes, coaches] = await Promise.all([
    prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, usedBy: true, usedAt: true, expiresAt: true, createdAt: true,
        coach:      { select: { id: true, name: true, email: true } },
        usedByUser: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'COACH' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    }),
  ])

  const enriched = codes.map((c) => ({
    ...c,
    status: (c.usedBy ? 'usado' : c.expiresAt < now ? 'vencido' : 'activo') as 'usado' | 'vencido' | 'activo',
  }))

  // Conversión
  const conversionInput = enriched.map((c) => ({
    coachId:   c.coach.id,
    coachName: c.coach.name,
    status:    c.status,
    createdAt: c.createdAt,
    usedAt:    c.usedAt,
  }))
  const overall  = computeOverallConversion(conversionInput)
  const perCoach = computePerCoachConversion(conversionInput)

  const active  = enriched.filter((c) => c.status === 'activo').length
  const used    = enriched.filter((c) => c.status === 'usado').length
  const expired = enriched.filter((c) => c.status === 'vencido').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Invite Codes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestión de códigos de invitación de coaches — ver, revocar y generar.
        </p>
      </div>

      {/* Stats generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Activos</p>
          <p className="text-3xl font-extrabold text-green-600">{active}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Usados</p>
          <p className="text-3xl font-extrabold text-gray-900">{used}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Vencidos</p>
          <p className="text-3xl font-extrabold text-gray-400">{expired}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tasa de conversión</p>
          {overall.conversionRate !== null ? (
            <>
              <p className={`text-3xl font-extrabold ${overall.conversionRate >= 70 ? 'text-green-600' : overall.conversionRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                {overall.conversionRate}%
              </p>
              {overall.avgHoursToUse !== null && (
                <p className="text-xs text-gray-400 mt-1">
                  Promedio {overall.avgHoursToUse}h hasta usar
                </p>
              )}
            </>
          ) : (
            <p className="text-3xl font-extrabold text-gray-300">—</p>
          )}
        </div>
      </div>

      {/* Conversión por coach — solo si hay más de 1 coach con códigos */}
      {perCoach.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Conversión por coach</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tasa = usados / (usados + vencidos) — excluye códigos aún activos
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Coach</th>
                <th className="px-5 py-3 text-right">Generados</th>
                <th className="px-5 py-3 text-right">Usados</th>
                <th className="px-5 py-3 text-right">Vencidos</th>
                <th className="px-5 py-3 text-right">Conversión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {perCoach.map((row) => (
                <tr key={row.coachId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{row.coachName ?? '—'}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{row.generated}</td>
                  <td className="px-5 py-3 text-right text-gray-900 font-medium">{row.used}</td>
                  <td className="px-5 py-3 text-right text-gray-400">{row.expiredUnused}</td>
                  <td className="px-5 py-3 text-right">
                    {row.conversionRate !== null ? (
                      <span className={`font-semibold ${row.conversionRate >= 70 ? 'text-green-600' : row.conversionRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                        {row.conversionRate}%
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">Sin datos aún</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InviteCodesClient codes={enriched} coaches={coaches} />
    </div>
  )
}
