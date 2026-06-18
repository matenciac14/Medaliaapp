/**
 * Shared gym week helpers — used by mobile/gym/week route.
 */

import { jsToOurDow } from '@/lib/core/date-utils'

export function getWeekBounds(offsetWeeks = 0): { monday: Date; sunday: Date } {
  const now = new Date()
  const dow = now.getDay()
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

export function buildWeekDates(monday: Date): Record<number, number> {
  const dates: Record<number, number> = {}
  for (let dow = 1; dow <= 7; dow++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + (dow - 1))
    dates[dow] = d.getDate()
  }
  return dates
}

type TemplateDay = {
  dayOfWeek: number
  isRestDay: boolean
  label: string
  muscleGroups?: string[] | null
}

export function buildDaySummaries(
  monday: Date,
  templateDays: TemplateDay[],
  completedDows: Set<number>,
  isCurrentWeek: boolean
) {
  const todayDow = jsToOurDow(new Date().getDay())
  const weekDates = buildWeekDates(monday)

  return [1, 2, 3, 4, 5, 6, 7].map(dow => {
    const workoutDay = templateDays.find(d => d.dayOfWeek === dow)
    return {
      dow,
      dateNum: weekDates[dow],
      isToday: isCurrentWeek && dow === todayDow,
      isCompleted: completedDows.has(dow),
      isRest: workoutDay?.isRestDay ?? !workoutDay,
      hasSession: !!workoutDay && !workoutDay.isRestDay,
      label: workoutDay?.label ?? null,
      muscleGroup: workoutDay?.muscleGroups?.[0] ?? null,
    }
  })
}
