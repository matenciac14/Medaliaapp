/**
 * Domain types for the Training Plan bounded context.
 * No Prisma, no Next.js — pure TypeScript.
 */

export type SessionIntensity = 'HIGH' | 'MODERATE' | 'LOW' | 'REST'
/** Must match DB enum SessionType exactly — values are in Spanish */
export type SessionType =
  | 'RODAJE_Z2'
  | 'FARTLEK'
  | 'TEMPO'
  | 'INTERVALOS'
  | 'TIRADA_LARGA'
  | 'FUERZA'
  | 'CICLA'
  | 'NATACION'
  | 'DESCANSO'
  | 'TEST'
  | 'SIMULACRO'
  | 'OTRO'

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
