import type { CalendarWeek } from '@/domain/calendar/calendar.types'
import type {
  WeightData,
  FoodTotals,
  NutritionTarget,
  CheckInData,
  BodyMeasures,
  HRZones,
} from '@/infrastructure/db/shared_athlete_data'

// Re-export so consumers import from one place
export type { WeightData, FoodTotals, NutritionTarget, CheckInData, BodyMeasures, HRZones }

// ── Session & Week (used by PlanClient + child components) ───────────

export type PlanWeekSession = {
  id: string
  dayOfWeek: number
  day: string
  type: string
  label: string
  done: boolean
  durationMin: number
  zoneTarget: string
  detailText: string
  structure: string | null
  intensity: string | null
  logId: string | null
  logDurationMin: number | null
  logRpe: number | null
  logHrAvg: number | null
  logNotes: string | null
  logDistanceKm: number | null
  coachNote: string | null
}

export type PlanWeek = {
  weekNumber: number
  phase: string
  volumeKm: number
  isRecoveryWeek: boolean
  hasTest: boolean
  focusDescription: string
  sessions: PlanWeekSession[]
}

export type PlanInfo = {
  name: string
  currentWeek: number
  totalWeeks: number
  startDate: string
}

// ── Completed plan ───────────────────────────────────────────────────

export type CompletedPlanInfo = {
  name: string
  totalWeeks: number
  endDate: string
  sessionsLogged: number
  sessionsTotal: number
  recoveryDaysSinceEnd: number
  completedAdherencePct: number
  lastWeekSessions: {
    dayOfWeek: number
    type: string
    label: string
    durationMin: number
    zone: string
    done: boolean
  }[]
  phases: string[]
}

// ── Page data (returned by getPlanPageData) ──────────────────────────

export type PlanPageData = {
  state: 'active' | 'completed' | 'empty'
  plan: PlanInfo | null
  weeks: PlanWeek[]
  completedPlan: CompletedPlanInfo | null
  initialCalendarWeek: CalendarWeek | null
  nutritionTarget: NutritionTarget | null
  todayConsumed: FoodTotals | null
  weightData: WeightData | null
  checkInData: CheckInData | null
  bodyMeasures: BodyMeasures | null
  hrZones: HRZones | null
  coachName: string | null
  raceDays: number | null
  pendingSuggestionsCount: number
  isB2B: boolean
}
