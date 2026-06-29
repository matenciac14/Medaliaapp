import { prisma } from '@/lib/db/prisma'
import { getWeekMonday, formatWeekRange, jsToWeekIdx } from '@/lib/core/date-utils'
import type { CalendarDay, CalendarWeek } from './calendar.types'

/**
 * Builds a unified CalendarWeek for a given athlete by merging:
 *   - PlannedSession rows from their active TrainingPlan
 *   - WorkoutDay rows from their active AssignedWorkout
 *   - GymSession completion records
 *
 * @param userId  Athlete's user ID
 * @param weekOffset  0 = current week, -1 = last week, +1 = next week, etc.
 */
export async function buildCalendarWeek(userId: string, weekOffset: number): Promise<CalendarWeek> {
  const monday = getWeekMonday(weekOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd = sunday.toISOString().split('T')[0]
  const label = formatWeekRange(monday)

  // ── 1. Parallel reads ────────────────────────────────────────────────────────

  // Find active plan first — needed to compute weekNumber from calendar date
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { id: true, startDate: true },
  })

  // Map calendar week → plan weekNumber (1-indexed, same formula as Plan page)
  let targetWeekNumber: number | null = null
  if (activePlan) {
    const diffDays = Math.floor(
      (monday.getTime() - new Date(activePlan.startDate).getTime()) / 86_400_000
    )
    targetWeekNumber = Math.floor(diffDays / 7) + 1
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

  // dow → GymSession (most recent if multiple)
  const gymSessionByDow = new Map<number, typeof gymSessions[number]>()
  for (const gs of gymSessions) {
    gymSessionByDow.set(gs.dayOfWeek, gs)
  }

  // dow → free SessionLog (most recent if multiple that day)
  const freeRunByDow = new Map<number, typeof freeRunLogs[number]>()
  for (const fl of freeRunLogs) {
    const dow = fl.completedAt.getDay() === 0 ? 7 : fl.completedAt.getDay() // JS Sun=0 → our 7
    freeRunByDow.set(dow, fl)
  }

  // ── 3. Build 7 CalendarDay objects (Mon–Sun) ─────────────────────────────────
  const days: CalendarDay[] = []

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    const dow = i + 1  // 1=Mon … 7=Sun
    const dateNum = day.getDate()
    const weekIdx = jsToWeekIdx(day.getDay())
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
            gymSessionId: gymSession?.id ?? null,
            done: gymSession?.completed ?? false,
            durationMin: gymSession?.durationMin ?? null,
            rpe: gymSession?.rpe ?? null,
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
