const PLAN_NAME_MAP: Record<string, string> = {
  RACE_HALF_MARATHON: 'Media Maratón', RACE_MARATHON: 'Maratón',
  RACE_10K: '10K', RACE_5K: '5K',
  BODY_RECOMPOSITION: 'Recomposición Corporal',
  STRENGTH_TRAINING: 'Entrenamiento de Fuerza',
  WEIGHT_LOSS: 'Pérdida de Peso', GENERAL_FITNESS: 'Fitness General',
  HALF_MARATHON_18W: 'Media Maratón', TEN_K_12W: '10K',
  FIVE_K_8W: '5K', BODY_RECOMPOSITION_16W: 'Recomposición Corporal',
}

/**
 * Returns the Monday date for a given week number relative to the current week.
 * Used to calculate calendar dates for past/future weeks of the plan.
 */
export function getWeekMonday(currentWeekNum: number, activeWeekNum: number): Date {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - (todayDow - 1))
  thisMonday.setHours(0, 0, 0, 0)
  const monday = new Date(thisMonday)
  monday.setDate(thisMonday.getDate() + (activeWeekNum - currentWeekNum) * 7)
  return monday
}

/** Formats minutes as "X h Y" or "X min". */
export function formatVolume(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m}`
}

/** Strips date suffix and "Plan " prefix, then maps to display name. */
export function formatPlanName(name: string): string {
  const base = name.split(' — ')[0].split(' - ')[0].replace(/^Plan\s+/i, '').trim()
  return PLAN_NAME_MAP[base] ?? base
}
