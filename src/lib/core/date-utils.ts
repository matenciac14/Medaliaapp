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
