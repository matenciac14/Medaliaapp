/**
 * A single day in the unified athlete calendar.
 * Merges TrainingPlan sessions + AssignedWorkout (gym) data by date.
 */
export type CalendarDay = {
  /** ISO date string: YYYY-MM-DD */
  date: string
  /** 1=Mon … 7=Sun (our schema convention) */
  dow: number
  /** 0=Mon … 6=Sun (week index for UI rendering) */
  weekIdx: number
  /** Calendar date number for display (1-31) */
  dateNum: number

  // ── Sport session (TrainingPlan) ─────────────────────────────────
  sport: {
    sessionId: string
    type: string          // SessionType
    intensity: string     // SessionIntensity
    durationMin: number
    zoneTarget: string | null
    detailText: string | null
    done: boolean
    logId: string | null
    logDurationMin: number | null
    logRpe: number | null
    logHrAvg: number | null
    logNotes: string | null
  } | null

  // ── Gym session (AssignedWorkout) ────────────────────────────────
  gym: {
    workoutDayId: string | null
    label: string         // WorkoutDay.label
    gymSessionId: string | null
    done: boolean
    durationMin: number | null
    rpe: number | null
  } | null

  // ── Free run log (SessionLog sin plannedSessionId) ────────────────
  freeRun: {
    sessionLogId: string
    type: string          // RODAJE_Z2 | TEMPO | INTERVALOS | etc.
    durationMin: number | null
    distanceKm: number | null
    rpe: number | null
  } | null
}

export type CalendarWeek = {
  /** ISO date string of Monday for this week */
  weekStart: string
  /** ISO date string of Sunday for this week */
  weekEnd: string
  /** Formatted display label e.g. "16–22 jun" */
  label: string
  /** 0 = current week, negative = past, positive = future */
  weekOffset: number
  days: CalendarDay[]
}
