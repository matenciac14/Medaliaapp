// ---------------------------------------------------------------------------
// daily-target.ts — Target nutricional del día según la sesión planificada
// ---------------------------------------------------------------------------

export type DailyNutritionTarget = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  label: string        // "Día duro", "Día fácil", "Día descanso"
  intensity: string    // HIGH | MODERATE | LOW | REST
}

export type NutritionPlanTargets = {
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
}

/**
 * Dado el intensity de la sesión del día y el plan nutricional del atleta,
 * devuelve el target de kcal y macros para ese día.
 */
export function getDailyNutritionTarget(
  intensity: string | null | undefined,
  plan: NutritionPlanTargets
): DailyNutritionTarget {
  switch (intensity) {
    case 'HIGH':
      return {
        kcal: plan.targetKcalHard,
        proteinG: plan.proteinG,
        carbsG: plan.carbsHardG,
        fatG: plan.fatG,
        label: 'Día duro',
        intensity: 'HIGH',
      }
    case 'MODERATE':
      return {
        kcal: plan.targetKcalEasy,
        proteinG: plan.proteinG,
        carbsG: plan.carbsEasyG,
        fatG: plan.fatG,
        label: 'Día moderado',
        intensity: 'MODERATE',
      }
    case 'LOW':
      return {
        kcal: Math.round(plan.targetKcalEasy * 0.88), // ~200 kcal menos que fácil
        proteinG: plan.proteinG,
        carbsG: Math.round(plan.carbsEasyG * 0.75),
        fatG: plan.fatG,
        label: 'Día suave',
        intensity: 'LOW',
      }
    case 'REST':
    default:
      return {
        kcal: plan.targetKcalRest,
        proteinG: plan.proteinG,
        carbsG: Math.round(plan.carbsEasyG * 0.6),
        fatG: plan.fatG,
        label: 'Día descanso',
        intensity: intensity ?? 'REST',
      }
  }
}
