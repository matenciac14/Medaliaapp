/**
 * Domain types for the Training Plan bounded context.
 * No Prisma, no Next.js — pure TypeScript.
 */

export type SessionIntensity = 'HIGH' | 'MODERATE' | 'LOW' | 'REST'
export type SessionType =
  | 'EASY_RUN'
  | 'TEMPO'
  | 'INTERVALS'
  | 'LONG_RUN'
  | 'REST'
  | 'CROSS_TRAINING'
  | 'STRENGTH'
  | 'GYM'
  | 'CUSTOM'

export type PlannedSession = {
  id: string
  dayOfWeek: number        // 1=Mon … 7=Sun (matches DB schema dayOfWeek)
  type: SessionType
  intensity: SessionIntensity
  durationMin: number
  description: string | null   // maps to DB detailText
  coachNotes: string | null
  zone: string | null          // maps to DB zoneTarget
  weekNumber: number
}

export type PlanWeek = {
  id: string
  weekNumber: number
  phase: string
  focus: string | null
  sessions: PlannedSession[]
}

export type ActivePlan = {
  id: string
  userId: string
  goalType: string
  currentWeek: number
  totalWeeks: number
  sessions: PlannedSession[]  // sessions for the active week
}

export type PlannedSessionUpdate = Partial<
  Pick<PlannedSession, 'intensity' | 'durationMin' | 'description' | 'coachNotes' | 'type' | 'zone'>
>
