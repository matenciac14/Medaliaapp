export interface CoachKpis {
  ingresosMes: number
  athletesDisplay: string
  tierPct: number | null
  checkInsPct: number
  checkInsWeekCount: number
  totalCount: number
  unreadMessagesCount: number
  thisMonthCount: number
}

export interface LastWeekSummary {
  revenue: number
  checkInPct: number
  retentionPct: number | null
  sportEntries: [string, number][]
  prevCheckInPct: number
  prevRevenue: number
  sessionsCount: number
  inactiveCount: number
  weekLabel: string
}

export interface FeedItem {
  type: 'checkin' | 'gym' | 'run' | 'payment'
  athleteName: string
  athleteId: string
  ts: Date
  detail: string
}

export type { MappedAthlete } from '@/infrastructure/db/coach-athlete.mapper'
import type { MappedAthlete } from '@/infrastructure/db/coach-athlete.mapper'

export interface OverduePayment {
  id: string
  amount: unknown
  dueDate: Date
  athleteId: string | null
  athlete: { name: string | null } | null
}

export interface PendingOnboarding {
  athleteId: string
  createdAt: Date
  athlete: { id: string; name: string | null; email: string | null }
}

export interface CoachDashboardSummary {
  greeting: string
  firstName: string
  subLineParts: string[]
  profileComplete: boolean

  kpis: CoachKpis
  saludScore: number | null
  saludColor: string

  athletesWithAlerts: MappedAthlete[]
  totalAlerts: number
  athletesWithoutPlan: MappedAthlete[]

  overduePayments: OverduePayment[]
  overdueTotal: number
  pendingOnboarding: PendingOnboarding[]

  lastWeek: LastWeekSummary
  feedItems: FeedItem[]
  totalCount: number
}
