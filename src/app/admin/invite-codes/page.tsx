import { prisma } from '@/lib/db/prisma'
import { InviteCodesClient } from './_components/InviteCodesClient'

export default async function AdminInviteCodesPage() {
  const now = new Date()

  const [codes, coaches] = await Promise.all([
    prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, usedBy: true, usedAt: true, expiresAt: true, createdAt: true,
        coach: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'COACH' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    }),
  ])

  // Batch-fetch atletas que usaron códigos
  const usedByIds = codes.map((c) => c.usedBy).filter(Boolean) as string[]
  const athletes = usedByIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: usedByIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const athleteById = Object.fromEntries(athletes.map((a) => [a.id, a]))

  const enriched = codes.map((c) => ({
    ...c,
    status: c.usedBy ? 'usado' : c.expiresAt < now ? 'vencido' : 'activo',
    usedByUser: c.usedBy ? (athleteById[c.usedBy] ?? null) : null,
  }))

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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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
      </div>

      <InviteCodesClient codes={enriched} coaches={coaches} />
    </div>
  )
}
