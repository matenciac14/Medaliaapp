import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { mapRelation } from '../athletes/_lib/map-athlete'

const SPORT_LABELS: Record<string, string> = {
  RUNNING:   '🏃 Running',
  STRENGTH:  '🏋️ Fuerza',
  CYCLING:   '🚴 Ciclismo',
  SWIMMING:  '🏊 Natación',
  TRIATHLON: '🏅 Triatlón',
  FOOTBALL:  '⚽ Fútbol',
}

export default async function CoachDashboardPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    coachRelations,
    totalCount,
    checkInsWeekCount,
    thisMonthCount,
    lastMonthTotal,
    recentActivity,
    sportRows,
  ] = await Promise.all([
    // Todos los atletas para calcular alertas, adherencia y deporte
    prisma.coachAthlete.findMany({
      where: { coachId },
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
                  include: { sessions: { where: { date: { lte: now } }, include: { log: { select: { id: true } } } } },
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
            goals: { where: { status: 'ACTIVE' }, take: 1 },
          },
        },
      },
    }),
    prisma.coachAthlete.count({ where: { coachId, status: 'ACTIVE' } }),
    prisma.coachAthlete.count({
      where: { coachId, status: 'ACTIVE', athlete: { checkIns: { some: { recordedAt: { gte: sevenDaysAgo } } } } },
    }),
    // Nuevos este mes
    prisma.coachAthlete.count({ where: { coachId, createdAt: { gte: startOfMonth } } }),
    // Total que existían el mes pasado (para calcular retención)
    prisma.coachAthlete.count({ where: { coachId, createdAt: { lt: startOfMonth, gte: startOfLastMonth } } }),
    // Feed de actividad: últimos 8 check-ins de los atletas de este coach
    prisma.weeklyCheckIn.findMany({
      where: { user: { coachedBy: { some: { coachId } } } },
      orderBy: { recordedAt: 'desc' },
      take: 8,
      select: {
        recordedAt: true,
        weekNumber: true,
        energyLevel: true,
        weightKg: true,
        user: { select: { id: true, name: true } },
      },
    }),
    // Distribución por deporte
    prisma.healthProfile.findMany({
      where: { user: { coachedBy: { some: { coachId } } } },
      select: { sport: true },
    }),
  ])

  const athletes = coachRelations.map((rel) => mapRelation(rel, now))

  const totalAlerts = athletes.reduce((acc, a) => {
    const f = a.alertFlags
    return acc + (f.noCheckin ? 1 : 0) + (f.highRpe ? 1 : 0) + (f.weightDrop ? 1 : 0)
  }, 0)

  const avgAdherence =
    athletes.length > 0
      ? Math.round(athletes.reduce((acc, a) => acc + a.adherencePct, 0) / athletes.length)
      : 0

  const checkInsPct = totalCount > 0 ? Math.round((checkInsWeekCount / totalCount) * 100) : 0
  const ingresosMes = totalCount * 6

  // Distribución por deporte
  const sportCounts: Record<string, number> = {}
  for (const row of sportRows) {
    if (row.sport) sportCounts[row.sport] = (sportCounts[row.sport] ?? 0) + 1
  }
  const sportEntries = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])

  // Top atletas con alertas para el panel de atención
  const athletesWithAlerts = athletes.filter(
    (a) => a.alertFlags.noCheckin || a.alertFlags.highRpe || a.alertFlags.weightDrop
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Vista general de tu negocio · {now.toLocaleDateString('es', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <a
          href="/coach/clients/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          + Nuevo asesorado
        </a>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Ingresos / mes"
          value={`$${ingresosMes}`}
          sub={`${totalCount} × $6 USD`}
          color="#16a34a"
        />
        <KpiCard
          label="Atletas activos"
          value={`${totalCount}`}
          sub={thisMonthCount > 0 ? `+${thisMonthCount} este mes` : 'sin nuevos este mes'}
          color="#1e3a5f"
        />
        <KpiCard
          label="Check-ins semana"
          value={`${checkInsWeekCount}/${totalCount}`}
          sub={`${checkInsPct}% de adherencia`}
          color={checkInsPct >= 70 ? '#16a34a' : checkInsPct >= 40 ? '#d97706' : '#dc2626'}
        />
        <KpiCard
          label="Adherencia promedio"
          value={`${avgAdherence}%`}
          sub="al plan de entrenamiento"
          color={avgAdherence >= 70 ? '#16a34a' : avgAdherence >= 40 ? '#d97706' : '#dc2626'}
        />
      </div>

      {/* Middle row: Alertas + Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Atletas que requieren atención */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="font-semibold text-gray-900 text-sm">Requieren atención</h2>
            {totalAlerts > 0 && (
              <span className="ml-auto text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {totalAlerts} alertas
              </span>
            )}
            <Link href="/coach/athletes?filter=alerts" className="text-xs text-blue-600 hover:underline ml-2">
              Ver todos →
            </Link>
          </div>
          {athletesWithAlerts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-gray-400">Todos tus atletas están al día</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {athletesWithAlerts.slice(0, 5).map((a) => {
                const alerts: { msg: string; color: string }[] = []
                if (a.alertFlags.noCheckin) alerts.push({ msg: 'Sin check-in +7d', color: '#dc2626' })
                if (a.alertFlags.highRpe) alerts.push({ msg: 'Carga alta', color: '#f97316' })
                if (a.alertFlags.weightDrop) alerts.push({ msg: `−${a.alertFlags.weightDropKg.toFixed(1)}kg`, color: '#eab308' })
                return (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-900 text-sm truncate">{a.name}</p>
                        {a.status === 'PAUSED' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 shrink-0">Pausado</span>
                        )}
                      </div>
                      <div className="flex gap-1.5 mt-0.5">
                        {alerts.map((al, i) => (
                          <span key={i} className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: al.color + '20', color: al.color }}>
                            {al.msg}
                          </span>
                        ))}
                      </div>
                    </div>
                    <a
                      href={`/coach/athlete/${a.id}`}
                      className="flex-shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: '#1e3a5f' }}
                    >
                      Ver →
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Distribución por deporte + stats rápidos */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Distribución deporte</h2>
            {sportEntries.length === 0 ? (
              <p className="text-xs text-gray-400">Sin datos de deporte</p>
            ) : (
              <div className="space-y-2.5">
                {sportEntries.map(([sport, count]) => (
                  <div key={sport}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{SPORT_LABELS[sport] ?? sport}</span>
                      <span className="font-semibold text-gray-800">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((count / totalCount) * 100)}%`,
                          backgroundColor: '#1e3a5f',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Este mes</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nuevos asesorados</span>
                <span className="font-semibold" style={{ color: '#16a34a' }}>+{thisMonthCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mes anterior</span>
                <span className="font-semibold text-gray-700">{lastMonthTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Proyección ingresos</span>
                <span className="font-semibold" style={{ color: '#16a34a' }}>${totalCount * 6} USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Actividad reciente</h2>
          <Link href="/coach/athletes" className="text-xs text-blue-600 hover:underline">
            Ver todos los atletas →
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">Sin actividad reciente</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recentActivity.map((ci, i) => {
              const daysAgo = Math.floor((now.getTime() - new Date(ci.recordedAt).getTime()) / 86_400_000)
              const when = daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `Hace ${daysAgo}d`
              return (
                <li key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>
                    {(ci.user.name ?? 'A').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{ci.user.name ?? 'Atleta'}</span>
                      {' '}completó check-in semana {ci.weekNumber}
                      {ci.energyLevel ? ` · energía ${ci.energyLevel}/10` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{when}</p>
                  </div>
                  <a href={`/coach/athlete/${ci.user.id}`} className="text-xs text-blue-600 hover:underline flex-shrink-0">
                    Ver →
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold leading-tight" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
