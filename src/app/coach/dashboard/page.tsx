import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { mapRelation } from '../athletes/_lib/map-athlete'
import { getCoachLimits } from '@/domain/subscription/tier-features'

const SPORT_LABELS: Record<string, string> = {
  RUNNING:   '🏃 Running',
  STRENGTH:  '🏋️ Fuerza',
  CYCLING:   '🚴 Ciclismo',
  SWIMMING:  '🏊 Natación',
  TRIATHLON: '🏅 Triatlón',
  FOOTBALL:  '⚽ Fútbol',
}

// Paleta determinista por inicial para avatares del feed
const AVATAR_COLORS = [
  '#1e3a5f', '#16a34a', '#ea580c', '#7c3aed',
  '#0891b2', '#dc2626', '#d97706', '#0d9488',
]
function avatarColor(name: string): string {
  const code = name.charCodeAt(0) ?? 0
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

export default async function CoachDashboardPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // ── Round 1 ──────────────────────────────────────────────────────────────
  const [
    coachRelations,
    totalCount,
    checkInsWeekCount,
    thisMonthCount,
    lastMonthTotal,
    recentCheckIns,
    sportRows,
    overduePayments,
    pendingOnboarding,
    paidThisMonthAgg,
    coachSubscription,
  ] = await Promise.all([
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
    prisma.coachAthlete.count({ where: { coachId, createdAt: { gte: startOfMonth } } }),
    prisma.coachAthlete.count({ where: { coachId, createdAt: { lt: startOfMonth, gte: startOfLastMonth } } }),
    prisma.weeklyCheckIn.findMany({
      where: { user: { coachedBy: { some: { coachId } } } },
      orderBy: { recordedAt: 'desc' },
      take: 5,
      select: {
        recordedAt: true,
        weekNumber: true,
        energyLevel: true,
        weightKg: true,
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.healthProfile.findMany({
      where: { user: { coachedBy: { some: { coachId } } } },
      select: { sport: true },
    }),
    prisma.payment.findMany({
      where: { coachId, status: 'PENDING', dueDate: { lt: now } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: { id: true, amount: true, dueDate: true, athleteId: true, athlete: { select: { name: true } } },
    }),
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
    prisma.payment.aggregate({
      where: { coachId, status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.userSubscription.findUnique({
      where: { userId: coachId },
      select: { coachTier: true },
    }),
  ])

  // ── Round 2: datos nuevos ────────────────────────────────────────────────
  const [
    unreadMessagesCount,
    lastWeekCheckInsCount,
    lastWeekPaymentAgg,
    recentGymSessions,
    recentRunSessions,
    recentPaidPayments,
  ] = await Promise.all([
    prisma.message.count({ where: { toId: coachId, readAt: null } }),
    prisma.weeklyCheckIn.count({
      where: {
        user: { coachedBy: { some: { coachId } } },
        recordedAt: { gte: twoWeeksAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.payment.aggregate({
      where: { coachId, status: 'PAID', paidAt: { gte: twoWeeksAgo, lt: sevenDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.gymSession.findMany({
      where: { athlete: { coachedBy: { some: { coachId } } }, completed: true, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'desc' },
      take: 5,
      select: { id: true, date: true, rpe: true, durationMin: true, athlete: { select: { id: true, name: true } } },
    }),
    prisma.sessionLog.findMany({
      where: { user: { coachedBy: { some: { coachId } } }, completedAt: { gte: sevenDaysAgo }, discipline: 'RUNNING' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: { id: true, completedAt: true, durationMin: true, distanceKm: true, rpe: true, user: { select: { id: true, name: true } } },
    }),
    prisma.payment.findMany({
      where: { coachId, status: 'PAID', paidAt: { gte: sevenDaysAgo } },
      orderBy: { paidAt: 'desc' },
      take: 3,
      select: { id: true, amount: true, paidAt: true, athleteId: true, athlete: { select: { name: true } } },
    }),
  ])

  // ── Derived values ───────────────────────────────────────────────────────
  const athletes = coachRelations.map((rel) => mapRelation(rel, now))
  const athletesWithoutPlan = athletes.filter((a) => a.planStatus === null)
  const athletesWithAlerts = athletes.filter((a) => a.alertFlags.noCheckin || a.alertFlags.highRpe || a.alertFlags.weightDrop)
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
  const tierPct = maxAthletes === Infinity ? null : Math.round((totalCount / maxAthletes) * 100)
  const athletesDisplay = maxAthletes === Infinity ? `${totalCount}` : `${totalCount}/${maxAthletes}`

  const sportCounts: Record<string, number> = {}
  for (const row of sportRows) {
    if (row.sport) sportCounts[row.sport] = (sportCounts[row.sport] ?? 0) + 1
  }
  const sportEntries = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])

  // Greeting
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = (session.user.name ?? 'Coach').split(' ')[0]

  const subLineParts: string[] = []
  if (athletesWithAlerts.length > 0) subLineParts.push(`${athletesWithAlerts.length} atleta${athletesWithAlerts.length !== 1 ? 's' : ''} requieren atención`)
  if (overduePayments.length > 0) subLineParts.push(`${overduePayments.length} pago${overduePayments.length !== 1 ? 's' : ''} vencido${overduePayments.length !== 1 ? 's' : ''}`)
  if (pendingOnboarding.length > 0) subLineParts.push(`${pendingOnboarding.length} pendiente${pendingOnboarding.length !== 1 ? 's' : ''} de onboarding`)
  if (subLineParts.length === 0) subLineParts.push('Todo al día · buen trabajo 🎉')

  // Salud negocio
  const alertPct = totalCount > 0 ? Math.round(((totalCount - athletesWithAlerts.length) / totalCount) * 100) : 100
  const saludScore = totalCount === 0 ? null : Math.min(100, Math.round(checkInsPct * 0.4 + alertPct * 0.3 + (avgAdherence ?? 50) * 0.3))
  const saludColor = saludScore === null ? '#9ca3af' : saludScore >= 75 ? '#16a34a' : saludScore >= 50 ? '#d97706' : '#dc2626'

  // Semana pasada
  const lastWeekRevenue = Number(lastWeekPaymentAgg._sum.amount ?? 0)
  const lastWeekCheckInPct = totalCount > 0 ? Math.round((lastWeekCheckInsCount / totalCount) * 100) : 0
  const retentionPct = lastMonthTotal > 0 ? Math.min(100, Math.round((totalCount / (totalCount + lastMonthTotal)) * 100)) : null

  // Feed unificado
  type FeedItem = { type: string; athleteName: string; athleteId: string; ts: Date; detail: string }
  const feedItems: FeedItem[] = [
    ...recentCheckIns.map(ci => ({
      type: 'checkin',
      athleteName: ci.user.name ?? 'Atleta',
      athleteId: ci.user.id,
      ts: new Date(ci.recordedAt),
      detail: `completó check-in S${ci.weekNumber}${ci.weightKg ? ` — peso ${ci.weightKg}kg` : ''}${ci.energyLevel ? ` · energía ${ci.energyLevel}/10` : ''}`,
    })),
    ...recentGymSessions.map(gs => ({
      type: 'gym',
      athleteName: gs.athlete.name ?? 'Atleta',
      athleteId: gs.athlete.id,
      ts: new Date(gs.date),
      detail: `registró sesión de fuerza${gs.durationMin ? ` — ${gs.durationMin}min` : ''}${gs.rpe ? ` · RPE ${gs.rpe}` : ''}`,
    })),
    ...recentRunSessions.map(sl => ({
      type: 'run',
      athleteName: sl.user.name ?? 'Atleta',
      athleteId: sl.user.id,
      ts: new Date(sl.completedAt),
      detail: `completó sesión de running${sl.distanceKm ? ` — ${sl.distanceKm.toFixed(1)}km` : ''}${sl.durationMin ? ` · ${sl.durationMin}min` : ''}${sl.rpe ? ` · RPE ${sl.rpe}` : ''}`,
    })),
    ...recentPaidPayments.map(p => ({
      type: 'payment',
      athleteName: p.athlete?.name ?? 'Asesorado',
      athleteId: p.athleteId ?? '',
      ts: new Date(p.paidAt!),
      detail: `pagó $${Number(p.amount)} USD`,
    })),
  ]
  feedItems.sort((a, b) => b.ts.getTime() - a.ts.getTime())
  const topFeedItems = feedItems.slice(0, 8)

  function timeAgo(ts: Date): string {
    const diff = now.getTime() - ts.getTime()
    const mins = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)
    if (mins < 60) return `Hace ${mins}m`
    if (hours < 24) return `Hace ${hours}h`
    if (days === 1) return 'Ayer'
    return `Hace ${days}d`
  }

  const TRIGGER_LABEL: Record<string, { msg: string; color: string }> = {
    rpe_excesivo:        { msg: 'RPE alto',         color: '#ea580c' },
    dolor_activo:        { msg: 'Dolor activo',      color: '#dc2626' },
    sueno_bajo:          { msg: 'Sueño bajo',        color: '#7c3aed' },
    energia_baja:        { msg: 'Energía baja',      color: '#d97706' },
    estres_alto:         { msg: 'Estrés alto',       color: '#b45309' },
    motivacion_baja:     { msg: 'Motivación baja',   color: '#6b7280' },
    fc_alta:             { msg: 'FC elevada',         color: '#dc2626' },
    perdida_peso_rapida: { msg: 'Baja peso rápido',  color: '#eab308' },
  }

  const overdueTotal = overduePayments.reduce((acc, p) => acc + Number(p.amount), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Banner: perfil incompleto */}
      {!session.user.profileComplete && (
        <div className="mb-5 rounded-md px-3 py-2.5 h-8 flex items-center" style={{ backgroundColor: '#fff2e0' }}>
          <p className="text-[10px] font-medium" style={{ color: '#995900' }}>
            ⚠ Completa tu perfil profesional — registra tu cédula y WhatsApp para invitar asesorados.{' '}
            <Link href="/coach/profile" className="underline hover:opacity-80">
              Completar ahora →
            </Link>
          </p>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[22px] font-bold leading-tight" style={{ color: '#1f3b5e' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-[11px] mt-1" style={{ color: '#738090' }}>{subLineParts.join(' · ')}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {saludScore !== null && (
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center border-[3px]"
                style={{ backgroundColor: '#1f3b5e', borderColor: '#22c35d' }}
              >
                <span className="text-base font-bold text-white">{saludScore}</span>
              </div>
              <span className="text-[9px] font-medium" style={{ color: '#738090' }}>Salud negocio</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <a
              href="/coach/invite"
              className="inline-flex items-center px-4 py-2 rounded-lg text-[11px] font-medium border hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#ccd1d9', color: '#1f3b5e' }}
            >
              Compartir link
            </a>
            <a
              href="/coach/clients/new"
              className="inline-flex items-center px-4 py-2 rounded-lg text-[11px] font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#1f3b5e' }}
            >
              + Nuevo
            </a>
          </div>
        </div>
      </div>

      {/* First-time experience */}
      {totalCount === 0 && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-[#1e3a5f]/20 bg-gradient-to-br from-[#1e3a5f]/5 to-orange-50 p-8">
          <div className="max-w-lg">
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">Bienvenido a Medaliq</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Tu panel está listo. El siguiente paso es agregar a tus primeros asesorados para empezar a gestionar sus planes, check-ins y progreso.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/coach/clients/new" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: '#ea580c' }}>
                + Agregar primer asesorado
              </a>
              <a href="/coach/invite" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors">
                Compartir link de invitación
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI ROW ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">

        {/* Ingresos */}
        <div className="bg-white rounded-lg border border-gray-100 p-3 relative overflow-hidden h-20">
          <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#ea580c' }} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#738090' }}>Ingresos / mes</p>
              <p className="text-[22px] font-bold leading-tight mt-0.5" style={{ color: '#ea580c' }}>
                {ingresosMes > 0 ? `$${ingresosMes.toFixed(0)}` : '—'}
              </p>
            </div>
            <div className="flex items-end gap-[5px] mt-1">
              {[20, 28, 35, 42].map((h, i) => (
                <div key={i} className="w-[10px] rounded-sm" style={{ height: h, backgroundColor: '#ea580c', opacity: i === 3 ? 1 : 0.3 }} />
              ))}
            </div>
          </div>
          <p className="text-[9px] mt-0.5" style={{ color: '#808c99' }}>
            {ingresosMes > 0 ? 'pagos registrados este mes' : 'sin pagos este mes'}
          </p>
        </div>

        {/* Atletas activos */}
        <div className="bg-white rounded-lg border border-gray-100 p-3 relative overflow-hidden h-20">
          <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#1e3a5f' }} />
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#738090' }}>Atletas activos</p>
          <div className="flex items-center justify-between">
            <p className="text-[22px] font-bold leading-tight mt-0.5" style={{ color: '#1e3a5f' }}>{athletesDisplay}</p>
            {tierPct !== null && tierPct >= 80 && (
              <a
                href="/coach/settings/plan"
                className="text-[8px] font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#f2f5fa', color: '#1f3b5e' }}
              >
                {tierPct}% · Upgrade →
              </a>
            )}
          </div>
          <p className="text-[9px] mt-0.5" style={{ color: '#808c99' }}>
            {thisMonthCount > 0 ? `+${thisMonthCount} este mes` : 'sin nuevos este mes'}
          </p>
        </div>

        {/* Check-ins semana */}
        <div className="bg-white rounded-lg border border-gray-100 p-3 flex items-start justify-between gap-2 relative overflow-hidden h-20">
          <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#22c35d' }} />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#738090' }}>Check-ins semana</p>
            <p className="text-[22px] font-bold leading-tight mt-0.5" style={{ color: checkInsPct >= 70 ? '#22c35d' : checkInsPct >= 40 ? '#d97706' : '#dc2626' }}>
              {checkInsWeekCount}/{totalCount}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: '#808c99' }}>{checkInsPct}% de adherencia</p>
          </div>
          <div className="shrink-0 relative w-10 h-10">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={checkInsPct >= 70 ? '#22c35d' : checkInsPct >= 40 ? '#d97706' : '#dc2626'}
                strokeWidth="3"
                strokeDasharray={`${checkInsPct} ${100 - checkInsPct}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: checkInsPct >= 70 ? '#22c35d' : checkInsPct >= 40 ? '#d97706' : '#dc2626' }}>{checkInsPct}%</span>
          </div>
        </div>

        {/* Mensajes sin leer */}
        <div className="bg-white rounded-lg border border-gray-100 p-3 relative overflow-hidden h-20">
          <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#ea580c' }} />
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#738090' }}>Mensajes sin leer</p>
          <p className="text-[22px] font-bold leading-tight mt-0.5" style={{ color: unreadMessagesCount > 0 ? '#ea580c' : '#9ca3af' }}>
            {unreadMessagesCount > 0 ? unreadMessagesCount : '—'}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: '#808c99' }}>
            {unreadMessagesCount > 0
              ? <a href="/coach/athletes" className="hover:underline" style={{ color: '#808c99' }}>de {unreadMessagesCount} atletas · Responder →</a>
              : 'bandeja al día'
            }
          </p>
        </div>
      </div>

      {/* ── ALERTAS + ACCIONES RÁPIDAS ─────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_220px] md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_430px] gap-3 mb-5">

        {/* Requieren atención */}
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <h2 className="text-[13px] font-semibold" style={{ color: '#1f3b5e' }}>● Requieren atención</h2>
            {totalAlerts > 0 && (
              <span className="text-[9px] font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ea580c' }}>
                {totalAlerts} alertas
              </span>
            )}
            <Link href="/coach/athletes?filter=alerts" className="ml-auto text-[11px] font-medium" style={{ color: '#ea580c' }}>
              Ver todos →
            </Link>
          </div>
          {athletesWithAlerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-[11px]" style={{ color: '#808c99' }}>Todos tus atletas están al día</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-[250px] overflow-y-auto">
              {athletesWithAlerts.slice(0, 5).map((a) => {
                const alerts: { msg: string; color: string }[] = []
                if (a.alertFlags.noCheckin) alerts.push({ msg: `Sin check-in >7d`, color: '#8c6633' })
                const triggerAlerts = (a.alertFlags.adjustments ?? [])
                  .map((t: string) => TRIGGER_LABEL[t])
                  .filter(Boolean) as { msg: string; color: string }[]
                if (triggerAlerts.length > 0) {
                  alerts.push(...triggerAlerts)
                } else if (a.alertFlags.highRpe) {
                  alerts.push({ msg: 'Carga alta', color: '#8c6633' })
                }
                if (a.alertFlags.weightDrop) alerts.push({ msg: `−${a.alertFlags.weightDropKg.toFixed(1)}kg`, color: '#8c6633' })

                return (
                  <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: '#1f3b5e' }}
                    >
                      {a.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold" style={{ color: '#1f3b5e' }}>{a.name}</p>
                        {alerts.map((al, i) => (
                          <span key={i} className="text-[9px] font-medium px-2 py-0.5 rounded" style={{ backgroundColor: '#f7f2eb', color: al.color }}>
                            {al.msg}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] shrink-0" style={{ color: '#8c99a6' }}>
                      hace {a.lastCheckInDaysAgo >= 999 ? '?' : a.lastCheckInDaysAgo}d
                    </span>
                    <a
                      href={`/coach/athletes/${a.id}`}
                      className="shrink-0 text-[10px] font-semibold text-white px-2.5 py-1 rounded-md"
                      style={{ backgroundColor: '#1f3b5e' }}
                    >
                      Ver →
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white rounded-lg p-4">
          <h2 className="text-[13px] font-semibold mb-4" style={{ color: '#1f3b5e' }}>Acciones rápidas</h2>
          <div className="space-y-2">
            {[
              { letter: 'G', color: '#22c35d', label: 'Nueva rutina',        sub: 'Crear plantilla gym',      href: '/coach/gym/routines/new' },
              { letter: 'R', color: '#ea580c', label: 'Crear sesión running', sub: 'Asignar a atleta',         href: '/coach/athletes' },
              { letter: 'N', color: '#1f3b5e', label: 'Plantilla nutrición',  sub: 'Macro targets',            href: '/coach/nutrition' },
              { letter: '+', color: '#6b7280', label: 'Agregar asesorado',    sub: 'Invitar o crear',          href: '/coach/clients/new' },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: action.color + '1f', color: action.color }}
                >
                  {action.letter}
                </div>
                <div className="flex-1 min-w-0 hidden md:block">
                  <p className="text-xs font-semibold truncate" style={{ color: '#1f3b5e' }}>{action.label}</p>
                  <p className="text-[10px] truncate" style={{ color: '#808c99' }}>{action.sub}</p>
                </div>
                <span className="text-sm hidden lg:block" style={{ color: '#b2b8bf' }}>→</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAGOS VENCIDOS + PENDIENTES ────────────────────────────────────── */}
      {(overduePayments.length > 0 || pendingOnboarding.length > 0 || athletesWithoutPlan.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

          {/* Pagos vencidos */}
          {overduePayments.length > 0 && (
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <h2 className="text-[13px] font-semibold" style={{ color: '#1f3b5e' }}>Pagos vencidos</h2>
                <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: '#22c35d' }}>
                  {overduePayments.length}
                </span>
              </div>
              <p className="px-4 pt-2 text-[10px]" style={{ color: '#808c99' }}>${overdueTotal.toFixed(0)} USD pendientes</p>
              <ul className="divide-y divide-gray-50 max-h-[170px] overflow-y-auto">
                {overduePayments.map((p) => {
                  const daysOverdue = Math.floor((now.getTime() - p.dueDate.getTime()) / 86_400_000)
                  const isUrgent = daysOverdue >= 10
                  return (
                    <li key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: '#1f3b5e' }}>{p.athlete?.name ?? 'Asesorado eliminado'}</p>
                        <p className="text-[10px]" style={{ color: '#808c99' }}>${Number(p.amount)} USD · {daysOverdue}d vencido</p>
                      </div>
                      <span
                        className="text-[9px] font-medium px-2 py-0.5 rounded shrink-0"
                        style={isUrgent
                          ? { backgroundColor: '#ea580c1a', color: '#ea580c' }
                          : { backgroundColor: '#f9fafb', color: '#6b7280' }
                        }
                      >
                        {isUrgent ? 'Urgente' : 'Pendiente'}
                      </span>
                      {p.athleteId && (
                        <a
                          href={`/coach/athletes/${p.athleteId}`}
                          className="shrink-0 text-[10px] font-semibold text-white px-2.5 py-1 rounded-md"
                          style={{ backgroundColor: '#ea580c' }}
                        >
                          Cobrar →
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
              <div className="px-4 py-2 border-t border-gray-50">
                <a href="/coach/finanzas" className="text-[10px] font-medium" style={{ color: '#808c99' }}>Ver finanzas →</a>
              </div>
            </div>
          )}

          {/* Pendientes (onboarding + sin plan) */}
          {(pendingOnboarding.length > 0 || athletesWithoutPlan.length > 0) && (
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-[13px] font-semibold" style={{ color: '#1f3b5e' }}>Pendientes</h2>
              </div>

              {pendingOnboarding.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-[10px] font-semibold mb-2" style={{ color: '#738090' }}>Pendientes onboarding</p>
                  <div className="space-y-2 max-h-[120px] overflow-y-auto">
                    {pendingOnboarding.map((rel) => {
                      const daysAgo = Math.floor((now.getTime() - rel.createdAt.getTime()) / 86_400_000)
                      const isLate = daysAgo >= 2
                      return (
                        <div key={rel.athleteId} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: '#1f3b5e' }}>{rel.athlete.name ?? rel.athlete.email}</p>
                            <p className="text-[10px]" style={{ color: '#808c99' }}>Invitada hace {daysAgo}d · Sin acceso</p>
                          </div>
                          {isLate && <span className="text-[9px] font-medium shrink-0" style={{ color: '#ea580c' }}>Más de 48h</span>}
                          <a
                            href={`/coach/athletes/${rel.athleteId}`}
                            className="text-[10px] font-medium shrink-0"
                            style={{ color: '#ea580c' }}
                          >
                            Reenviar link
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {athletesWithoutPlan.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold mb-2" style={{ color: '#738090' }}>Sin plan asignado</p>
                  <div className="space-y-2 max-h-[120px] overflow-y-auto">
                    {athletesWithoutPlan.slice(0, 4).map((a) => (
                      <div key={a.id} className="flex items-center gap-3">
                        <p className="flex-1 text-[11px] truncate" style={{ color: '#4d5966' }}>{a.name}</p>
                        <p className="text-[10px] shrink-0" style={{ color: '#808c99' }}>{a.sport ? SPORT_LABELS[a.sport]?.replace(/^.\s/, '') ?? a.sport : 'Sin deporte'}</p>
                        <a href={`/coach/athletes/${a.id}`} className="text-[10px] font-medium shrink-0" style={{ color: '#ea580c' }}>
                          Asignar plan →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SEMANA PASADA ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 mb-5">
        <div className="bg-white rounded-lg px-4 py-3">
          <p className="text-xs font-semibold" style={{ color: '#1f3b5e' }}>Semana pasada</p>
          <p className="text-[10px] mt-1" style={{ color: '#738090' }}>
            {lastWeekCheckInPct}% check-ins
            {lastWeekRevenue > 0 && ` · $${lastWeekRevenue.toFixed(0)} cobrados`}
            {' · '}{sportEntries.map(([s, c]) => `${c} ${SPORT_LABELS[s]?.replace(/^.\s/, '') ?? s}`).join(', ')}
            {'    '}
            <Link href="/coach/athletes" className="font-medium hover:underline" style={{ color: '#738090' }}>
              Ver reporte completo →
            </Link>
          </p>
        </div>
        {retentionPct !== null && (
          <div className="bg-white rounded-lg px-4 py-3 flex items-center gap-2">
            <div>
              <p className="text-[11px] font-medium" style={{ color: '#738090' }}>Retención</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold" style={{ color: '#22c35d' }}>{retentionPct}%</span>
                <span className="text-[10px]" style={{ color: '#808c99' }}>{now.toLocaleDateString('es', { month: 'long' })}</span>
              </div>
            </div>
            <div className="ml-auto flex items-end gap-1.5">
              {[30, 28, 29, 29].map((h, i) => (
                <div key={i} className="w-[14px] rounded-sm" style={{ height: h, backgroundColor: '#1e3a5f', opacity: 0.4 }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ACTIVIDAD RECIENTE ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold" style={{ color: '#1f3b5e' }}>Actividad reciente</h2>
          <Link href="/coach/athletes" className="text-[11px] font-medium" style={{ color: '#ea580c' }}>
            Ver todos los atletas →
          </Link>
        </div>
        {topFeedItems.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[11px]" style={{ color: '#808c99' }}>Sin actividad reciente</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
            {topFeedItems.map((item, i) => (
              <li key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: (item.type === 'checkin' ? '#22c35d' : avatarColor(item.athleteName)) + '1f', color: item.type === 'checkin' ? '#22c35d' : avatarColor(item.athleteName) }}
                >
                  {item.type === 'checkin' ? '✓' : item.athleteName.slice(0, 1).toUpperCase()}
                </div>
                <p className="flex-1 text-[11px] min-w-0" style={{ color: '#33404d' }}>
                  <span className="font-semibold">{item.athleteName}</span>
                  {' '}{item.detail}
                </p>
                <span className="text-[10px] shrink-0" style={{ color: '#8c99a6' }}>{timeAgo(item.ts)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
