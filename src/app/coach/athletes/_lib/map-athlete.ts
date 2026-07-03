import { getPlanWeekNumber } from '@/lib/core/week-number'

export const TAKE = 20

export type MappedAthlete = {
  id: string
  name: string
  email: string
  sport: string
  goal: string | null
  currentWeek: number
  totalWeeks: number
  phase: string | null
  lastCheckInDaysAgo: number
  weightKg: number | null
  weightGoalKg: number | null
  hrResting: number | null
  adherencePct: number
  alerts: string[]
  planStatus: string
  status: 'ACTIVE' | 'PAUSED'
  alertFlags: {
    noCheckin: boolean
    highRpe: boolean
    weightDrop: boolean
    weightDropKg: number
    adjustments: string[]
  }
}

// Input shape — matches Prisma query result from both page.tsx and API route.
// Sessions are expected to be pre-filtered to past dates (date <= now) in the query.
type InputRow = {
  id: string // CoachAthlete.id — used as cursor
  status: string
  athlete: {
    id: string
    name: string | null
    email: string | null
    profile: {
      weightKg: number | null
      weightGoalKg: number | null
      hrResting: number | null
      sport: string | null
    } | null
    trainingPlans: Array<{
      status: string
      startDate: Date
      totalWeeks: number
      weeks: Array<{
        weekNumber: number
        phase: string
        sessions: Array<{ log: { id: string } | null }>
      }>
    }>
    checkIns: Array<{
      recordedAt: Date
      weightKg: number | null
      hrResting: number | null
      hardestSessionRpe: number | null
      adjustmentsTriggered: string[]
      weekNumber: number
    }>
    goals: Array<{ type: string }>
  }
}

export function mapRelation(rel: InputRow, now: Date): MappedAthlete {
  const { athlete } = rel
  const plan = athlete.trainingPlans[0] ?? null
  const lastCheckIn = athlete.checkIns[0] ?? null
  const prevCheckIn = athlete.checkIns[1] ?? null

  const daysSince = lastCheckIn
    ? Math.floor((now.getTime() - new Date(lastCheckIn.recordedAt).getTime()) / 86_400_000)
    : 999

  const currentWeek = plan
    ? getPlanWeekNumber(new Date(plan.startDate), plan.totalWeeks)
    : 0

  const allPastSessions = plan?.weeks.filter((w) => w.weekNumber <= currentWeek).flatMap((w) => w.sessions) ?? []
  const completedCount = allPastSessions.filter((s) => s.log !== null).length
  const adherencePct =
    allPastSessions.length > 0
      ? Math.round((completedCount / allPastSessions.length) * 100)
      : 0

  const currentPlanWeek =
    plan?.weeks.find((w) => w.weekNumber === currentWeek) ??
    plan?.weeks[plan.weeks.length - 1]

  const weightDrop =
    lastCheckIn?.weightKg && prevCheckIn?.weightKg
      ? prevCheckIn.weightKg - lastCheckIn.weightKg
      : 0
  const highRpe = (lastCheckIn?.hardestSessionRpe ?? 0) >= 8
  const weightAlert = weightDrop > 0.75
  const noCheckinAlert = daysSince >= 7
  const adjustments = lastCheckIn?.adjustmentsTriggered ?? []

  return {
    id: athlete.id,
    name: athlete.name ?? 'Atleta',
    email: athlete.email ?? '',
    sport: athlete.profile?.sport ?? '',
    goal: athlete.goals[0]?.type ?? null,
    currentWeek,
    totalWeeks: plan?.totalWeeks ?? 0,
    phase: (currentPlanWeek?.phase as string) ?? null,
    lastCheckInDaysAgo: daysSince,
    weightKg: lastCheckIn?.weightKg ?? athlete.profile?.weightKg ?? null,
    weightGoalKg: athlete.profile?.weightGoalKg ?? null,
    hrResting: lastCheckIn?.hrResting ?? athlete.profile?.hrResting ?? null,
    adherencePct,
    alerts: adjustments,
    planStatus: plan?.status ?? 'SIN PLAN',
    status: (rel.status as 'ACTIVE' | 'PAUSED') ?? 'ACTIVE',
    alertFlags: {
      noCheckin: noCheckinAlert,
      highRpe,
      weightDrop: weightAlert,
      weightDropKg: weightDrop,
      adjustments,
    },
  }
}
