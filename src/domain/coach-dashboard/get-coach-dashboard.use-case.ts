import type { MappedAthlete } from '@/infrastructure/db/coach-athlete.mapper'
import type { CoachDashboardSummary, FeedItem, OverduePayment, PendingOnboarding } from './coach-dashboard.types'

const SPORT_LABELS: Record<string, string> = {
  RUNNING:   '🏃 Running',
  STRENGTH:  '🏋️ Fuerza',
  CYCLING:   '🚴 Ciclismo',
  SWIMMING:  '🏊 Natación',
  TRIATHLON: '🏅 Triatlón',
  FOOTBALL:  '⚽ Fútbol',
}

const AVATAR_COLORS = [
  '#1e3a5f', '#16a34a', '#ea580c', '#7c3aed',
  '#0891b2', '#dc2626', '#d97706', '#0d9488',
]

export const TRIGGER_LABEL: Record<string, { msg: string; color: string }> = {
  rpe_excesivo:        { msg: 'RPE alto',           color: '#ea580c' },
  dolor_activo:        { msg: 'Dolor activo',       color: '#dc2626' },
  sueno_bajo:          { msg: 'Sueño bajo',         color: '#7c3aed' },
  energia_baja:        { msg: 'Energía baja',       color: '#d97706' },
  estres_alto:         { msg: 'Estrés alto',        color: '#b45309' },
  motivacion_baja:     { msg: 'Motivación baja',    color: '#6b7280' },
  fc_alta:             { msg: 'FC elevada',          color: '#dc2626' },
  perdida_peso_rapida: { msg: 'Baja peso rápido',   color: '#eab308' },
}

export function avatarColor(name: string): string {
  const code = name.charCodeAt(0) ?? 0
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

export function timeAgo(ts: Date, now: Date): string {
  const diff = now.getTime() - ts.getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 60) return `Hace ${mins}m`
  if (hours < 24) return `Hace ${hours}h`
  if (days === 1) return 'Ayer'
  return `Hace ${days}d`
}

export { SPORT_LABELS }

export interface DashboardInput {
  coachId: string
  userName: string | null | undefined
  profileComplete: boolean
  now: Date
  athletes: MappedAthlete[]
  totalCount: number
  checkInsWeekCount: number
  thisMonthCount: number
  lastMonthTotal: number
  ingresosMes: number
  unreadMessagesCount: number
  coachTier: string
  maxAthletes: number
  sportRows: { sport: string | null }[]
  overduePayments: OverduePayment[]
  pendingOnboarding: PendingOnboarding[]
  lastWeekCheckInsCount: number
  lastWeekRevenue: number
  recentCheckIns: { recordedAt: Date; weekNumber: number; energyLevel: number | null; weightKg: number | null; user: { id: string; name: string | null } }[]
  recentGymSessions: { id: string; date: Date; rpe: number | null; durationMin: number | null; athlete: { id: string; name: string | null } }[]
  recentRunSessions: { id: string; completedAt: Date; durationMin: number | null; distanceKm: number | null; rpe: number | null; user: { id: string; name: string | null } }[]
  recentPaidPayments: { id: string; amount: unknown; paidAt: Date | null; athleteId: string | null; athlete: { name: string | null } | null }[]
  prevWeekCheckInsCount: number
  prevWeekRevenue: number
  lastWeekGymCount: number
  lastWeekRunCount: number
}

export function getCoachDashboardSummary(input: DashboardInput): CoachDashboardSummary {
  const { athletes, now, totalCount } = input

  const athletesWithAlerts = athletes.filter((a) => a.alertFlags.noCheckin || a.alertFlags.highRpe || a.alertFlags.weightDrop)
  const athletesWithoutPlan = athletes.filter((a) => a.planStatus === null)
  const athletesWithPlan = athletes.filter((a) => a.planStatus === 'ACTIVE')

  const totalAlerts = athletes.reduce((acc, a) => {
    const f = a.alertFlags
    return acc + (f.noCheckin ? 1 : 0) + (f.highRpe ? 1 : 0) + (f.weightDrop ? 1 : 0)
  }, 0)

  const avgAdherence = athletesWithPlan.length > 0
    ? Math.round(athletesWithPlan.reduce((acc, a) => acc + a.adherencePct, 0) / athletesWithPlan.length)
    : null

  const checkInsPct = totalCount > 0 ? Math.round((input.checkInsWeekCount / totalCount) * 100) : 0
  const tierPct = input.maxAthletes === Infinity ? null : Math.round((totalCount / input.maxAthletes) * 100)
  const athletesDisplay = input.maxAthletes === Infinity ? `${totalCount}` : `${totalCount}/${input.maxAthletes}`

  const sportCounts: Record<string, number> = {}
  for (const row of input.sportRows) {
    if (row.sport) sportCounts[row.sport] = (sportCounts[row.sport] ?? 0) + 1
  }
  const sportEntries = Object.entries(sportCounts).sort((a, b) => b[1] - a[1]) as [string, number][]

  const greeting = buildGreeting(now)
  const firstName = (input.userName ?? 'Coach').split(' ')[0]
  const subLineParts = buildSubLine(athletesWithAlerts.length, input.overduePayments.length, input.pendingOnboarding.length)

  const alertPct = totalCount > 0 ? Math.round(((totalCount - athletesWithAlerts.length) / totalCount) * 100) : 100
  const saludScore = totalCount === 0 ? null : Math.min(100, Math.round(checkInsPct * 0.4 + alertPct * 0.3 + (avgAdherence ?? 50) * 0.3))
  const saludColor = saludScore === null ? '#9ca3af' : saludScore >= 75 ? '#16a34a' : saludScore >= 50 ? '#d97706' : '#dc2626'

  const lastWeekCheckInPct = totalCount > 0 ? Math.round((input.lastWeekCheckInsCount / totalCount) * 100) : 0
  const prevWeekCheckInPct = totalCount > 0 ? Math.round((input.prevWeekCheckInsCount / totalCount) * 100) : 0
  const retentionPct = input.lastMonthTotal > 0 ? Math.min(100, Math.round((totalCount / (totalCount + input.lastMonthTotal)) * 100)) : null
  const inactiveCount = athletesWithAlerts.filter((a) => a.alertFlags.noCheckin).length
  const sessionsCount = input.lastWeekGymCount + input.lastWeekRunCount
  const weekLabel = buildWeekLabel(input.now)

  const overdueTotal = input.overduePayments.reduce((acc, p) => acc + Number(p.amount), 0)

  const feedItems = buildFeedItems(input, now)

  return {
    greeting,
    firstName,
    subLineParts,
    profileComplete: input.profileComplete,
    kpis: {
      ingresosMes: input.ingresosMes,
      athletesDisplay,
      tierPct,
      checkInsPct,
      checkInsWeekCount: input.checkInsWeekCount,
      totalCount,
      unreadMessagesCount: input.unreadMessagesCount,
      thisMonthCount: input.thisMonthCount,
    },
    saludScore,
    saludColor,
    athletesWithAlerts,
    totalAlerts,
    athletesWithoutPlan,
    overduePayments: input.overduePayments,
    overdueTotal,
    pendingOnboarding: input.pendingOnboarding,
    lastWeek: {
      revenue: input.lastWeekRevenue,
      checkInPct: lastWeekCheckInPct,
      retentionPct,
      sportEntries,
      prevCheckInPct: prevWeekCheckInPct,
      prevRevenue: input.prevWeekRevenue,
      sessionsCount,
      inactiveCount,
      weekLabel,
    },
    feedItems,
    totalCount,
  }
}

function buildGreeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function buildWeekLabel(now: Date): string {
  const end = new Date(now.getTime() - 86_400_000)
  const start = new Date(end.getTime() - 6 * 86_400_000)
  const fmt = (d: Date) => `${d.getDate()}`
  const monthEnd = end.toLocaleDateString('es', { month: 'short' })
  const yearEnd = end.getFullYear()
  return `${fmt(start)} – ${fmt(end)} ${monthEnd} ${yearEnd}`
}

function buildSubLine(alertCount: number, overdueCount: number, pendingCount: number): string[] {
  const parts: string[] = []
  if (alertCount > 0) parts.push(`${alertCount} atleta${alertCount !== 1 ? 's' : ''} requieren atención`)
  if (overdueCount > 0) parts.push(`${overdueCount} pago${overdueCount !== 1 ? 's' : ''} vencido${overdueCount !== 1 ? 's' : ''}`)
  if (pendingCount > 0) parts.push(`${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''} de onboarding`)
  if (parts.length === 0) parts.push('Todo al día · buen trabajo 🎉')
  return parts
}

function buildFeedItems(input: DashboardInput, now: Date): FeedItem[] {
  const items: FeedItem[] = [
    ...input.recentCheckIns.map(ci => ({
      type: 'checkin' as const,
      athleteName: ci.user.name ?? 'Atleta',
      athleteId: ci.user.id,
      ts: new Date(ci.recordedAt),
      detail: `completó check-in S${ci.weekNumber}${ci.weightKg ? ` — peso ${ci.weightKg}kg` : ''}${ci.energyLevel ? ` · energía ${ci.energyLevel}/10` : ''}`,
    })),
    ...input.recentGymSessions.map(gs => ({
      type: 'gym' as const,
      athleteName: gs.athlete.name ?? 'Atleta',
      athleteId: gs.athlete.id,
      ts: new Date(gs.date),
      detail: `registró sesión de fuerza${gs.durationMin ? ` — ${gs.durationMin}min` : ''}${gs.rpe ? ` · RPE ${gs.rpe}` : ''}`,
    })),
    ...input.recentRunSessions.map(sl => ({
      type: 'run' as const,
      athleteName: sl.user.name ?? 'Atleta',
      athleteId: sl.user.id,
      ts: new Date(sl.completedAt),
      detail: `completó sesión de running${sl.distanceKm ? ` — ${sl.distanceKm.toFixed(1)}km` : ''}${sl.durationMin ? ` · ${sl.durationMin}min` : ''}${sl.rpe ? ` · RPE ${sl.rpe}` : ''}`,
    })),
    ...input.recentPaidPayments.map(p => ({
      type: 'payment' as const,
      athleteName: p.athlete?.name ?? 'Asesorado',
      athleteId: p.athleteId ?? '',
      ts: new Date(p.paidAt!),
      detail: `pago $${Number(p.amount)} USD`,
    })),
  ]
  items.sort((a, b) => b.ts.getTime() - a.ts.getTime())
  return items.slice(0, 8)
}
