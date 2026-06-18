export type DayType = 'hard' | 'easy' | 'rest'

/**
 * Maps SessionIntensity enum value to nutritional day type.
 * HIGH   → 'hard'  (targetKcalHard + carbsHardG)
 * REST   → 'rest'  (targetKcalRest)
 * others → 'easy'  (targetKcalEasy + carbsEasyG)
 */
export function intensityToDayType(intensity: string | null | undefined): DayType {
  if (intensity === 'HIGH') return 'hard'
  if (intensity === 'REST') return 'rest'
  return 'easy'
}
