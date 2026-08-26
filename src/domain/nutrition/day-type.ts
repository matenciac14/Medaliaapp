export type DayType = 'hard' | 'easy' | 'low' | 'rest'

/**
 * Maps SessionIntensity enum value to nutritional day type.
 * HIGH     → 'hard'  (targetKcalHard + carbsHardG)
 * MODERATE → 'easy'  (targetKcalEasy + carbsEasyG)
 * LOW      → 'low'   (targetKcalEasy×0.88 + carbsEasyG×0.75)
 * REST     → 'rest'  (targetKcalRest + carbsEasyG×0.7)
 */
export function intensityToDayType(intensity: string | null | undefined): DayType {
  if (intensity === 'HIGH') return 'hard'
  if (intensity === 'LOW') return 'low'
  if (intensity === 'REST') return 'rest'
  return 'easy'
}
