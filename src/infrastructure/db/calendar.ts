import { prisma } from '@/lib/db/prisma'
import { getWeekMonday, formatWeekRange } from '@/lib/core/date_utils'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import type { CalendarDay, CalendarWeek } from '@/domain/calendar/calendar.types'

/**
 * Builds a unified CalendarWeek for a given athlete by merging:
 *   - PlannedSession rows from their active TrainingPlan
 *   - WorkoutDay rows from their active AssignedWorkout
 *   - GymSession completion records
 *
 * @param userId  Athlete's user ID
 * @param weekOffset  0 = current week, -1 = last week, +1 = next week, etc.
 */
export async function buildCalendarWeek(userId: string, weekOffset: number, timezone?: string | null): Promise<CalendarWeek> {
  const monday = getWeekMonday(weekOffset, timezone)
  const sunday = new Date(monday.getTime() + 6 * 86_400_000 + 86_400_000 - 1)

  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd = sunday.toISOString().split('T')[0]
  const label = formatWeekRange(monday)

  // ── 1. Parallel reads ────────────────────────────────────────────────────────

  // Find active plan first — needed to compute weekNumber from calendar date
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { id: true, startDate: true, totalWeeks: true },
  })

  // Map calendar week → plan weekNumber usando la misma fórmula que dashboard/plan/checkin.
  // getPlanWeekNumber usa Date.now() como referencia → semana actual del plan.
  // weekOffset 0 = semana actual, -1 = semana pasada, +1 = semana siguiente.
  let targetWeekNumber: number | null = null
  if (activePlan) {
    const currentPlanWeek = getPlanWeekNumber(new Date(activePlan.startDate), activePlan.totalWeeks)
    targetWeekNumber = currentPlanWeek + weekOffset
  }

  const [plannedSessions, assignedWorkout, gymSessions, freeRunLogs] = await Promise.all([
    // Sport sessions by weekNumber — matches Plan page logic, avoids date misalignment
    activePlan && targetWeekNumber !== null && targetWeekNumber >= 1
      ? prisma.plannedSession.findMany({
          where: {
            week: {
              planId: activePlan.id,
              weekNumber: targetWeekNumber,
            },
          },
          include: { log: true },
          orderBy: { dayOfWeek: 'asc' },
        })
      : Promise.resolve([]),

    // Active gym assignment with all its days
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      include: {
        template: {
          include: {
            days: {
              where: { isRestDay: false },
              select: { id: true, dayOfWeek: true, label: true },
            },
          },
        },
      },
    }),

    // GymSessions completed this week (by actual date — correct for logs)
    prisma.gymSession.findMany({
      where: {
        athleteId: userId,
        date: { gte: monday, lte: sunday },
      },
      select: {
        id: true,
        dayOfWeek: true,
        date: true,
        completed: true,
        durationMin: true,
        rpe: true,
        notes: true,
        plannedSessionId: true,
      },
    }),

    // Free run logs this week (SessionLog without plannedSessionId)
    prisma.sessionLog.findMany({
      where: {
        userId,
        plannedSessionId: null,
        freeSessionType: { not: null },
        completedAt: { gte: monday, lte: sunday },
      },
      select: {
        id: true,
        completedAt: true,
        freeSessionType: true,
        durationMin: true,
        distanceKm: true,
        rpe: true,
      },
    }),
  ])

  // ── 2. Build lookup maps ─────────────────────────────────────────────────────

  // dow → PlannedSession
  const sportByDow = new Map<number, typeof plannedSessions[number]>()
  for (const s of plannedSessions) {
    sportByDow.set(s.dayOfWeek, s)
  }

  // dow → WorkoutDay
  const gymDayByDow = new Map<number, { id: string; dayOfWeek: number; label: string }>()
  if (assignedWorkout) {
    for (const d of assignedWorkout.template.days) {
      gymDayByDow.set(d.dayOfWeek, d)
    }
  }

  // dow → GymSession (most recent if multiple) — derive dow from actual UTC date
  const gymSessionByDow = new Map<number, typeof gymSessions[number]>()
  for (const gs of gymSessions) {
    const jsDay = new Date(gs.date).getUTCDay()
    const dow = jsDay === 0 ? 7 : jsDay
    gymSessionByDow.set(dow, gs)
  }

  // dow → free SessionLog (most recent if multiple that day)
  const freeRunByDow = new Map<number, typeof freeRunLogs[number]>()
  for (const fl of freeRunLogs) {
    const dow = fl.completedAt.getDay() === 0 ? 7 : fl.completedAt.getDay() // JS Sun=0 → our 7
    freeRunByDow.set(dow, fl)
  }

  // ── 3. Build 7 CalendarDay objects (Mon–Sun) ─────────────────────────────────
  // CRITICAL: getWeekMonday with timezone returns a UTC-midnight date.
  // Must use UTC methods (getUTCDate) or arithmetic — NOT local .getDate()/.getDay()
  // which shift dates on non-UTC servers (e.g. Colombia UTC-5).
  const days: CalendarDay[] = []

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday.getTime() + i * 86_400_000)
    const dow = i + 1  // 1=Mon … 7=Sun (we start from Monday, guaranteed)
    const weekIdx = i  // 0=Mon … 6=Sun
    const dateNum = day.getUTCDate()
    const dateStr = day.toISOString().split('T')[0]

    const sport = sportByDow.get(dow) ?? null
    const gymDay = gymDayByDow.get(dow) ?? null
    const gymSession = gymSessionByDow.get(dow) ?? null
    const freeRun = freeRunByDow.get(dow) ?? null

    days.push({
      date: dateStr,
      dow,
      weekIdx,
      dateNum,

      sport: sport
        ? {
            sessionId: sport.id,
            type: sport.type as string,
            intensity: sport.intensity as string,
            durationMin: sport.durationMin,
            zoneTarget: sport.zoneTarget ?? null,
            detailText: sport.detailText ?? null,
            done: !!sport.log,
            logId: sport.log?.id ?? null,
            logDurationMin: sport.log?.durationMin ?? null,
            logRpe: sport.log?.rpe ?? null,
            logHrAvg: sport.log?.hrAvg ?? null,
            logNotes: sport.log?.notes ?? null,
          }
        : null,

      gym: gymDay
        ? {
            workoutDayId: gymDay.id,
            label: gymDay.label,
            templateName: assignedWorkout?.template.name ?? null,
            gymSessionId: gymSession?.id ?? null,
            done: gymSession?.completed ?? false,
            durationMin: gymSession?.durationMin ?? null,
            rpe: gymSession?.rpe ?? null,
          }
        : gymSession
        ? {
            workoutDayId: null,
            label: gymSession.notes ?? 'Fuerza',
            templateName: assignedWorkout?.template.name ?? null,
            gymSessionId: gymSession.id,
            done: gymSession.completed,
            durationMin: gymSession.durationMin ?? null,
            rpe: gymSession.rpe ?? null,
          }
        : null,

      freeRun: freeRun
        ? {
            sessionLogId: freeRun.id,
            type: freeRun.freeSessionType!,
            durationMin: freeRun.durationMin ?? null,
            distanceKm: freeRun.distanceKm ?? null,
            rpe: freeRun.rpe ?? null,
          }
        : null,
    })
  }

  return { weekStart, weekEnd, label, weekOffset, days }
}
