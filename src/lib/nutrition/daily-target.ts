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
    case 'HIGH': {
      const proteinG = plan.proteinG
      const carbsG = plan.carbsHardG
      const fatG = plan.fatG
      return {
        kcal: Math.round(proteinG * 4 + carbsG * 4 + fatG * 9),
        proteinG,
        carbsG,
        fatG,
        label: 'Día duro',
        intensity: 'HIGH',
      }
    }
    case 'MODERATE': {
      const proteinG = plan.proteinG
      const carbsG = plan.carbsEasyG
      const fatG = plan.fatG
      return {
        kcal: Math.round(proteinG * 4 + carbsG * 4 + fatG * 9),
        proteinG,
        carbsG,
        fatG,
        label: 'Día moderado',
        intensity: 'MODERATE',
      }
    }
    case 'LOW': {
      const proteinG = plan.proteinG
      const carbsG = Math.round(plan.carbsEasyG * 0.75)
      const fatG = plan.fatG
      return {
        kcal: Math.round(proteinG * 4 + carbsG * 4 + fatG * 9),
        proteinG,
        carbsG,
        fatG,
        label: 'Día suave',
        intensity: 'LOW',
      }
    }
    case 'REST':
    default: {
      const proteinG = plan.proteinG
      const carbsG = Math.round(plan.carbsEasyG * 0.7)
      const fatG = plan.fatG
      return {
        kcal: Math.round(proteinG * 4 + carbsG * 4 + fatG * 9),
        proteinG,
        carbsG,
        fatG,
        label: 'Día descanso',
        intensity: intensity ?? 'REST',
      }
    }
  }
}
