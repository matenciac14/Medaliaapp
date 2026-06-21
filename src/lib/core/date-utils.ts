/**
 * JS getDay() returns 0=Sun, 1=Mon … 6=Sat.
 * Our schema uses dayOfWeek 1=Mon … 7=Sun.
 */
export function jsToOurDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

/**
 * Converts JS getDay() to a 0-based Mon-first week index.
 * Mon=0, Tue=1, … Sun=6
 */
export function jsToWeekIdx(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

/** Spanish month abbreviations (0-indexed). */
export const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'] as const

/**
 * Returns the Monday of the calendar week that is `offsetWeeks` away from today.
 * offsetWeeks=0 → this week's Monday, offsetWeeks=1 → next Monday, etc.
 */
export function getWeekMonday(offsetWeeks = 0): Date {
  const now = new Date()
  const dow = now.getDay()
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/**
 * Formats a week as "16–22 jun" or "30 jun – 6 jul".
 * Accepts the Monday of the week.
 */
export function formatWeekRange(monday: Date): string {
  const sun = new Date(monday)
  sun.setDate(monday.getDate() + 6)
  if (monday.getMonth() === sun.getMonth()) {
    return `${monday.getDate()}–${sun.getDate()} ${MONTHS[monday.getMonth()]}`
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`
}

/**
 * Returns a Record<dow, calendarDayNumber> for the week starting on `monday`.
 * dow follows our schema convention: 1=Mon … 7=Sun.
 */
export function buildWeekDateNumbers(monday: Date): Record<number, number> {
  const result: Record<number, number> = {}
  for (let dow = 1; dow <= 7; dow++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + (dow - 1))
    result[dow] = d.getDate()
  }
  return result
}
