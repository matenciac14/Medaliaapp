import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { mapRelation } from '../athletes/_lib/map-athlete'
import { KpiCard } from '@/app/_components/kpi-card'
import { getCoachLimits } from '@/domain/subscription/tier-features'

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
    overduePayments,
    pendingOnboarding,
    paidThisMonthAgg,
    coachSubscription,
  ] = await Promise.all([
    // UX-COACH-01: limitado a 25 más recientes para evitar query O(n) con joins profundos
    // Los totales y conteos usan queries separadas (count) más abajo
    prisma.coachAthlete.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      take: 25,
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
    // Pagos vencidos del coach
    prisma.payment.findMany({
      where: { coachId, status: 'PENDING', dueDate: { lt: now } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        dueDate: true,
        athleteId: true,
        athlete: { select: { name: true } },
      },
    }),
    // Atletas pendientes de onboarding (B2B sin completar)
    prisma.coachAthlete.findMany({
      where: { coachId, status: 'ACTIVE', athlete: { onboardingCompleted: false } },
      select: {
        athleteId: true,
        createdAt: true,
        athlete: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    }),
    // Ingresos reales del mes (pagos PAID con paidAt en el mes actual)
    prisma.payment.aggregate({
      where: { coachId, status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    // Suscripción del coach para conocer su tier y límite de atletas
    prisma.userSubscription.findUnique({
      where: { userId: coachId },
      select: { coachTier: true },
    }),
  ])

  const athletes = coachRelations.map((rel) => mapRelation(rel, now))

  const athletesWithoutPlan = athletes.filter((a) => a.planStatus === 'SIN PLAN')

  const totalAlerts = athletes.reduce((acc, a) => {
    const f = a.alertFlags
    return acc + (f.noCheckin ? 1 : 0) + (f.highRpe ? 1 : 0) + (f.weightDrop ? 1 : 0)
  }, 0)

  const athletesWithPlan = athletes.filter((a) => a.planStatus === 'ACTIVE')
  const avgAdherence: number | null =
    athletesWithPlan.length > 0
      ? Math.round(athletesWithPlan.reduce((acc, a) => acc + a.adherencePct, 0) / athletesWithPlan.length)
      : null

  const checkInsPct = totalCount > 0 ? Math.round((checkInsWeekCount / totalCount) * 100) : 0
  const ingresosMes = Number(paidThisMonthAgg._sum.amount ?? 0)
  const coachTier = coachSubscription?.coachTier ?? 'STARTER'
  const { maxAthletes } = getCoachLimits(coachTier)
  const athletesDisplay = maxAthletes === Infinity ? `${totalCount}` : `${totalCount}/${maxAthletes}`

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
      {/* Banner: perfil incompleto */}
      {!session.user.profileComplete && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 text-base">⚠️</span>
          <div>
            <span className="font-semibold">Completa tu perfil profesional</span>
            {' '}— necesitas registrar tu número de cédula y tu WhatsApp para poder invitar asesorados.{' '}
            <Link href="/coach/profile" className="underline font-medium hover:text-amber-900">
              Completar ahora →
            </Link>
          </div>
        </div>
      )}
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
        <div className="flex items-center gap-2">
          <a
            href="/coach/invite"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
          >
            Compartir link
          </a>
          <a
            href="/coach/clients/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            + Nuevo asesorado
          </a>
        </div>
      </div>

      {/* First-time experience — solo cuando no hay atletas */}
      {totalCount === 0 && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-[#1e3a5f]/20 bg-gradient-to-br from-[#1e3a5f]/5 to-orange-50 p-8">
          <div className="max-w-lg">
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">Bienvenido a Medaliq</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Tu panel está listo. El siguiente paso es agregar a tus primeros asesorados para empezar a gestionar sus planes, check-ins y progreso.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/coach/clients/new"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#ea580c' }}
              >
                + Agregar primer asesorado
              </a>
              <a
                href="/coach/invite"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
              >
                Compartir link de invitación
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              También puedes compartir tu link de invitación y que los atletas se registren solos.
            </p>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Ingresos / mes"
          value={ingresosMes > 0 ? `$${ingresosMes.toFixed(0)} USD` : '—'}
          sub={ingresosMes > 0 ? 'pagos registrados este mes' : 'sin pagos este mes'}
          color="#16a34a"
        />
        <KpiCard
          label="Atletas activos"
          value={athletesDisplay}
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
          value={avgAdherence !== null ? `${avgAdherence}%` : '—'}
          sub="al plan de entrenamiento"
          color={avgAdherence === null ? '#9ca3af' : avgAdherence >= 70 ? '#16a34a' : avgAdherence >= 40 ? '#d97706' : '#dc2626'}
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
                const TRIGGER_LABEL: Record<string, { msg: string; color: string }> = {
                  rpe_excesivo:   { msg: 'RPE alto',       color: '#ea580c' },
                  dolor_activo:   { msg: 'Dolor activo',   color: '#dc2626' },
                  sueno_bajo:     { msg: 'Sueño bajo',     color: '#7c3aed' },
                  energia_baja:   { msg: 'Energía baja',   color: '#d97706' },
                  estres_alto:    { msg: 'Estrés alto',    color: '#b45309' },
                  motivacion_baja:{ msg: 'Motivación baja',color: '#6b7280' },
                  fc_alta:        { msg: 'FC elevada',     color: '#dc2626' },
                  perdida_peso_rapida: { msg: 'Baja peso rápido', color: '#eab308' },
                }
                const alerts: { msg: string; color: string }[] = []
                if (a.alertFlags.noCheckin) alerts.push({ msg: 'Sin check-in +7d', color: '#dc2626' })
                // Use adjustments from check-in for differentiated labels
                const triggerAlerts = (a.alertFlags.adjustments ?? [])
                  .map((t: string) => TRIGGER_LABEL[t])
                  .filter(Boolean) as { msg: string; color: string }[]
                if (triggerAlerts.length > 0) {
                  alerts.push(...triggerAlerts)
                } else if (a.alertFlags.highRpe) {
                  alerts.push({ msg: 'Carga alta', color: '#ea580c' })
                }
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
                <span className="text-gray-500">Atletas totales</span>
                <span className="font-semibold text-gray-700">{totalCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagos vencidos */}
      {overduePayments.length > 0 && (
        <div className="mb-6 bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="font-semibold text-gray-900 text-sm">Pagos vencidos</h2>
            <span className="ml-auto text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {overduePayments.length} pendiente{overduePayments.length !== 1 ? 's' : ''}
            </span>
            <a href="/coach/finanzas" className="text-xs text-blue-600 hover:underline ml-2">
              Ver finanzas →
            </a>
          </div>
          <ul className="divide-y divide-gray-50">
            {overduePayments.map((p) => {
              const daysOverdue = Math.floor((now.getTime() - p.dueDate.getTime()) / 86_400_000)
              return (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.athlete?.name ?? 'Asesorado eliminado'}</p>
                    <p className="text-xs text-red-600">{daysOverdue}d vencido · ${Number(p.amount)} USD</p>
                  </div>
                  {p.athleteId && (
                    <a
                      href={`/coach/athlete/${p.athleteId}`}
                      className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      Cobrar →
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Atletas sin plan / pendientes de onboarding */}
      {(athletesWithoutPlan.length > 0 || pendingOnboarding.length > 0) && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingOnboarding.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                <span className="text-amber-500">⏳</span>
                <h2 className="font-semibold text-gray-900 text-sm">Pendientes de onboarding</h2>
                <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {pendingOnboarding.length}
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {pendingOnboarding.map((rel) => {
                  const daysAgo = Math.floor((now.getTime() - rel.createdAt.getTime()) / 86_400_000)
                  return (
                    <li key={rel.athleteId} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{rel.athlete.name ?? rel.athlete.email}</p>
                        <p className="text-xs text-gray-400">Invitado hace {daysAgo}d</p>
                      </div>
                      <a
                        href={`/coach/athlete/${rel.athleteId}`}
                        className="text-xs text-amber-700 font-semibold bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Ver →
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {athletesWithoutPlan.length > 0 && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-blue-100 flex items-center gap-2">
                <span className="text-blue-500">📋</span>
                <h2 className="font-semibold text-gray-900 text-sm">Sin plan asignado</h2>
                <span className="ml-auto text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {athletesWithoutPlan.length}
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {athletesWithoutPlan.slice(0, 5).map((a) => (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.sport ? a.sport : 'Sin deporte'}</p>
                    </div>
                    <a
                      href={`/coach/athlete/${a.id}`}
                      className="text-xs text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Asignar →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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

