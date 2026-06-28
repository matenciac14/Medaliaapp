import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import AthleteTabs from './_components/AthleteTabs'
import { TAKE, mapRelation } from './_lib/map-athlete'

export default async function CoachAthletesPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)

  const [coachRelations, totalCount, overduePayments] = await Promise.all([
    prisma.coachAthlete.findMany({
      where: { coachId },
      take: TAKE + 1,
      orderBy: { createdAt: 'asc' },
      include: {
        athlete: {
          include: {
            profile: true,
            trainingPlans: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: {
                weeks: {
                  orderBy: { weekNumber: 'asc' },
                  include: {
                    sessions: {
                      where: { date: { lte: now } },
                      include: { log: { select: { id: true } } },
                    },
                  },
                },
              },
            },
            checkIns: {
              orderBy: { recordedAt: 'desc' },
              take: 2,
              select: {
                recordedAt: true,
                weightKg: true,
                hrResting: true,
                hardestSessionRpe: true,
                adjustmentsTriggered: true,
                weekNumber: true,
              },
            },
            goals: {
              where: { status: 'ACTIVE' },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.coachAthlete.count({ where: { coachId } }),
    prisma.payment.findMany({ where: { coachId, status: 'OVERDUE' }, select: { athleteId: true } }),
  ])

  const hasMore = coachRelations.length > TAKE
  const page = hasMore ? coachRelations.slice(0, TAKE) : coachRelations
  const nextCursor = hasMore ? page[page.length - 1].id : null
  const athletes = page.map((rel) => mapRelation(rel, now))

  const overdueAthleteIds = [...new Set(overduePayments.map((p) => p.athleteId))]
  const totalAlerts = athletes.reduce((acc, a) => acc + a.alerts.length, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
            Mis Atletas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{totalCount} asesorados activos</p>
        </div>
        <div className="flex items-center gap-3">
          {totalAlerts > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 font-semibold text-sm px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {totalAlerts} alertas
            </span>
          )}
          <a
            href="/coach/clients/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            + Nuevo asesorado
          </a>
        </div>
      </div>

      {athletes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-5xl mb-4">🏃</p>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Aún no tienes asesorados</h2>
          <p className="text-gray-400 text-sm mb-6">Crea tu primer asesorado o comparte tu link de invitación</p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/coach/clients/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              + Crear asesorado
            </a>
            <a
              href="/coach/invite"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Invitar por código
            </a>
          </div>
        </div>
      )}

      {athletes.length > 0 && (
        <>
          <AlertsFeed athletes={athletes} overdueAthleteIds={overdueAthleteIds} />
          <AthleteTabs athletes={athletes} hasMore={hasMore} nextCursor={nextCursor} overdueAthleteIds={overdueAthleteIds} />
        </>
      )}
    </div>
  )
}

type AlertFlag = {
  noCheckin: boolean
  highRpe: boolean
  weightDrop: boolean
  weightDropKg: number
  adjustments: string[]
}

function AlertsFeed({ athletes, overdueAthleteIds }: { athletes: { id: string; name: string; alertFlags: AlertFlag }[]; overdueAthleteIds: string[] }) {
  const overdueSet = new Set(overdueAthleteIds)
  type AlertItem = { athleteId: string; name: string; type: string; message: string; color: string }
  const items: AlertItem[] = []

  for (const a of athletes) {
    const f = a.alertFlags
    if (f.noCheckin)
      items.push({ athleteId: a.id, name: a.name, type: 'sin-checkin', message: 'Sin check-in hace +7 días', color: '#dc2626' })
    if (f.highRpe)
      items.push({ athleteId: a.id, name: a.name, type: 'rpe', message: 'Carga/fatiga alta (RPE ≥ 8)', color: '#f97316' })
    if (f.weightDrop)
      items.push({ athleteId: a.id, name: a.name, type: 'peso', message: `Bajó ${f.weightDropKg.toFixed(1)} kg esta semana`, color: '#eab308' })
    if (f.adjustments.length > 0)
      items.push({ athleteId: a.id, name: a.name, type: 'ajuste', message: `Plan auto-ajustado: ${f.adjustments.join(', ')}`, color: '#6366f1' })
    if (overdueSet.has(a.id))
      items.push({ athleteId: a.id, name: a.name, type: 'mora', message: 'Pago vencido', color: '#ea580c' })
  }

  if (items.length === 0) return null

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <h2 className="font-semibold text-gray-900 text-sm">Alertas que requieren atención</h2>
        <span className="ml-auto text-xs text-gray-400">{items.length} activas</span>
      </div>
      <ul className="divide-y divide-gray-50">
        {items.map((item, i) => (
          <li key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <a href={`/coach/athlete/${item.athleteId}`} className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 text-sm">{item.name}</span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-gray-600 text-sm">{item.message}</span>
            </a>
            <a href={`/coach/athlete/${item.athleteId}`} className="text-xs text-blue-600 hover:underline flex-shrink-0">
              Ver →
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
