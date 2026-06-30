import { prisma } from '@/lib/db/prisma'

const ATHLETE_PRO_PRICE = 9.99  // USD/mes

function coachFeeRate(athleteCount: number): number {
  if (athleteCount === 0) return 0
  if (athleteCount <= 50)  return athleteCount * 6
  if (athleteCount <= 100) return 50 * 6 + (athleteCount - 50) * 5
  return 50 * 6 + 50 * 5 + (athleteCount - 100) * 3
}

function feeLabel(count: number): string {
  if (count === 0)   return '—'
  if (count <= 50)   return '$6/atleta'
  if (count <= 100)  return '$5/atleta (>50)'
  return '$3/atleta (>100)'
}

function fmt(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export default async function AdminFinanzasPage() {
  const now = new Date()

  const [proAthletes, coaches, paymentGroups] = await Promise.all([
    // Atletas con plan activo (Pro)
    prisma.user.count({ where: { role: 'ATHLETE', featurePlan: true } }),

    // Coaches con sus atletas activos
    prisma.user.findMany({
      where: { role: 'COACH' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        coachOf: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
    }),

    // Pagos registrados en plataforma (coach → atleta)
    prisma.payment.findMany({
      select: { amount: true, currency: true, status: true, dueDate: true },
    }),
  ])

  // MRR atletas
  const mrrAthletes = proAthletes * ATHLETE_PRO_PRICE

  // MRR fees coaches (lo que deben pagar a Medaliq)
  const coachesWithFee = coaches.map((c) => ({
    ...c,
    athleteCount: c.coachOf.length,
    fee: coachFeeRate(c.coachOf.length),
  }))
  const mrrCoaches = coachesWithFee.reduce((sum, c) => sum + c.fee, 0)
  const mrrTotal = mrrAthletes + mrrCoaches

  // Pagos en plataforma
  const paid    = paymentGroups.filter((p) => p.status === 'PAID')
  const pending = paymentGroups.filter((p) => p.status === 'PENDING' && p.dueDate >= now)
  const overdue = paymentGroups.filter((p) => p.status === 'PENDING' && p.dueDate < now)

  const sumCOP = (items: typeof paid) => items.reduce((s, p) => s + (p.currency === 'COP' ? p.amount : 0), 0)

  const kpis = [
    {
      label: 'MRR atletas Pro',
      value: fmt(mrrAthletes),
      sub: `${proAthletes} atletas × $${ATHLETE_PRO_PRICE}/mes`,
      color: '#7c3aed',
    },
    {
      label: 'Fee coaches (est.)',
      value: fmt(mrrCoaches),
      sub: `${coachesWithFee.filter((c) => c.athleteCount > 0).length} coaches con atletas`,
      color: '#f97316',
    },
    {
      label: 'MRR total estimado',
      value: fmt(mrrTotal),
      sub: 'Atletas Pro + fees de coaches',
      color: '#1e3a5f',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Revenue estimado de la plataforma — se actualiza en tiempo real desde la DB
        </p>
      </div>

      {/* MRR Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{k.label}</p>
            <p className="text-3xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Pagos en plataforma (coach → atleta) */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pagos recibidos', count: paid.length,    amount: sumCOP(paid),    color: 'text-green-600',  bg: 'bg-green-50  border-green-200' },
          { label: 'Pagos pendientes', count: pending.length, amount: sumCOP(pending), color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200' },
          { label: 'Pagos vencidos',   count: overdue.length, amount: sumCOP(overdue), color: 'text-red-600',    bg: 'bg-red-50    border-red-200' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-5 ${s.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{s.label} (coach→atleta)</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            {s.amount > 0 && (
              <p className="text-xs text-gray-400 mt-1">{fmt(s.amount, 'COP')} COP</p>
            )}
          </div>
        ))}
      </div>

      {/* Fee por coach */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Fee por coach</h2>
            <p className="text-xs text-gray-400 mt-0.5">Lo que cada coach debe pagar a Medaliq mensualmente</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p className="font-medium text-gray-600">1–50 asesorados: $6/c</p>
            <p>51–100: $5/c · +100: $3/c</p>
          </div>
        </div>

        {coachesWithFee.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Sin coaches registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Coach</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-right">Atletas activos</th>
                  <th className="px-5 py-3 text-left">Tramo</th>
                  <th className="px-5 py-3 text-right">Fee / mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coachesWithFee
                  .sort((a, b) => b.fee - a.fee)
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{c.name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{c.email}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${c.athleteCount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                          {c.athleteCount}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">{feeLabel(c.athleteCount)}</td>
                      <td className="px-5 py-3 text-right">
                        {c.fee > 0 ? (
                          <span className="font-semibold text-orange-600">{fmt(c.fee)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-700">Total fee coaches</td>
                  <td className="px-5 py-3 text-right font-extrabold text-orange-600">{fmt(mrrCoaches)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        * MRR estimado — precios hardcodeados hasta integrar Wompi/Stripe. Pagos coach→atleta en la moneda registrada por el coach.
      </p>
    </div>
  )
}
