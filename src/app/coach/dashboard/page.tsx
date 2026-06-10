import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import AthleteTabs from './_components/AthleteTabs'

export default async function CoachDashboardPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id

  const now = new Date()

  // ── Fetch atletas reales ──────────────────────────────────────────────────
  const coachRelations = await prisma.coachAthlete.findMany({
    where: { coachId },
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
                    include: {
                      log: { select: { id: true } },
                    },
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
  })

  // ── Mapear al tipo Athlete que espera AthleteTabs ─────────────────────────
  const athletesFromDB = coachRelations.map(({ athlete }) => {
    const plan        = athlete.trainingPlans[0] ?? null
    const lastCheckIn  = athlete.checkIns[0] ?? null
    const prevCheckIn  = athlete.checkIns[1] ?? null

    const daysSince = lastCheckIn
      ? Math.floor(
          (Date.now() - new Date(lastCheckIn.recordedAt).getTime()) / 86_400_000
        )
      : 999

    const currentWeek = plan
      ? Math.max(
          1,
          Math.floor(
            (Date.now() - new Date(plan.startDate).getTime()) / 604_800_000
          ) + 1
        )
      : 0

    // Adherencia real: sesiones pasadas con log / total sesiones pasadas
    const allPastSessions = plan?.weeks.flatMap((w) => w.sessions) ?? []
    const completedCount  = allPastSessions.filter((s) => s.log !== null).length
    const adherencePct    = allPastSessions.length > 0
      ? Math.round((completedCount / allPastSessions.length) * 100)
      : 0

    // Fase de la semana actual, no siempre semana 1
    const currentPlanWeek = plan?.weeks.find((w) => w.weekNumber === currentWeek)
      ?? plan?.weeks[plan.weeks.length - 1]

    // ── Compute alert flags ──────────────────────────────────────────────────
    const weightDrop = (lastCheckIn?.weightKg && prevCheckIn?.weightKg)
      ? prevCheckIn.weightKg - lastCheckIn.weightKg
      : 0
    const highRpe       = (lastCheckIn?.hardestSessionRpe ?? 0) >= 8
    const weightAlert   = weightDrop > 0.75 // > 750g en una semana
    const noCheckinAlert = daysSince >= 7
    const adjustments   = lastCheckIn?.adjustmentsTriggered ?? []

    return {
      id:                 athlete.id,
      name:               athlete.name ?? 'Atleta',
      email:              athlete.email ?? '',
      goal:               athlete.goals[0]?.type ?? 'GENERAL_FITNESS',
      currentWeek,
      totalWeeks:         plan?.totalWeeks ?? 0,
      phase:              (currentPlanWeek?.phase as string) ?? 'BASE',
      lastCheckInDaysAgo: daysSince,
      weightKg:           lastCheckIn?.weightKg ?? athlete.profile?.weightKg ?? 0,
      weightGoalKg:       athlete.profile?.weightGoalKg ?? 0,
      hrResting:          lastCheckIn?.hrResting ?? athlete.profile?.hrResting ?? 0,
      adherencePct,
      alerts:             adjustments,
      planStatus:         plan?.status ?? 'SIN PLAN',
      // nuevos flags para feed de alertas
      alertFlags: {
        noCheckin:    noCheckinAlert,
        highRpe,
        weightDrop:   weightAlert,
        weightDropKg: weightDrop,
        adjustments,
      },
    }
  })

  const athletes = athletesFromDB

  const totalAlerts     = athletes.reduce((acc, a) => acc + a.alerts.length, 0)
  const pendingCheckIns = athletes.filter((a) => a.lastCheckInDaysAgo >= 3).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
            Panel de entrenamiento
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{athletes.length} atletas activos</p>
        </div>
        {totalAlerts > 0 && (
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-red-100 text-red-700 font-semibold text-sm px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {totalAlerts} alertas activas
          </span>
        )}
      </div>

      {/* Empty state */}
      {athletes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-5xl mb-4">🏃</p>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Aún no tienes asesorados</h2>
          <p className="text-gray-400 text-sm mb-6">Crea tu primer asesorado o comparte tu link de invitación</p>
          <a
            href="/coach/clients/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            + Crear asesorado
          </a>
        </div>
      )}

      {/* Metric cards + list — solo si hay atletas */}
      {athletes.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <MetricCard label="Atletas activos"      value={athletes.length}  color="#1e3a5f" />
            <MetricCard label="Check-ins pendientes" value={pendingCheckIns}  color="#f97316" />
            <MetricCard label="Alertas activas"      value={totalAlerts}      color="#dc2626" />
          </div>
          <AlertsFeed athletes={athletes} />
          <AthleteTabs athletes={athletes} />
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

function AlertsFeed({ athletes }: { athletes: { id: string; name: string; alertFlags: AlertFlag }[] }) {
  type AlertItem = { athleteId: string; name: string; type: string; message: string; color: string }
  const items: AlertItem[] = []

  for (const a of athletes) {
    const f = a.alertFlags
    if (f.noCheckin) {
      items.push({ athleteId: a.id, name: a.name, type: 'sin-checkin', message: 'Sin check-in hace +7 días', color: '#dc2626' })
    }
    if (f.highRpe) {
      items.push({ athleteId: a.id, name: a.name, type: 'rpe', message: 'RPE ≥ 8 en última sesión dura', color: '#f97316' })
    }
    if (f.weightDrop) {
      items.push({ athleteId: a.id, name: a.name, type: 'peso', message: `Bajó ${f.weightDropKg.toFixed(1)} kg esta semana`, color: '#eab308' })
    }
    if (f.adjustments.length > 0) {
      items.push({ athleteId: a.id, name: a.name, type: 'ajuste', message: `Plan auto-ajustado: ${f.adjustments.join(', ')}`, color: '#6366f1' })
    }
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
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <a href={`/coach/athlete/${item.athleteId}`} className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 text-sm">{item.name}</span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-gray-600 text-sm">{item.message}</span>
            </a>
            <a
              href={`/coach/athlete/${item.athleteId}`}
              className="text-xs text-blue-600 hover:underline flex-shrink-0"
            >
              Ver →
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}
