// ---------------------------------------------------------------------------
// athlete-formulas.ts — Capa determinista
// Todas las funciones son puras: mismos inputs → mismos outputs.
// ---------------------------------------------------------------------------

// Re-exporta todas las fórmulas de entrenamiento existentes
export {
  calculateHRZones,
  calculateTDEE,
  calculateMacros,
  estimateHRMax,
  predictRaceTime,
  type HRZone,
  type HRZones,
  type MacroDay,
  type Macros,
} from '@/lib/plan/formulas'

import type { UserPlan } from '@/lib/config/user-config'

// ---------------------------------------------------------------------------
// Estado de cuenta — FREE | PRO
// ---------------------------------------------------------------------------

export type AccountStatus = 'FREE' | 'PRO'

export function getAccountStatus(userPlan: UserPlan): AccountStatus {
  return userPlan === 'PRO' ? 'PRO' : 'FREE'
}

// ---------------------------------------------------------------------------
// Nutrición por día — reflejo del entrenamiento
// ---------------------------------------------------------------------------

export type DayLoad = 'HIGH' | 'MODERATE' | 'LOW' | 'REST' | 'NONE'

/**
 * Devuelve los targets nutricionales para un día dado el tipo de carga.
 * Basado en TDEE + periodización clásica.
 */
export function getDailyNutritionTargets(
  tdee: number,
  weightKg: number,
  load: DayLoad
): { kcal: number; protein: number; carbs: number; fat: number } {
  const proteinG = Math.round(weightKg * 2)
  const proteinKcal = proteinG * 4

  const kcalByLoad: Record<DayLoad, number> = {
    HIGH:     tdee,
    MODERATE: tdee - 200,
    LOW:      tdee - 350,
    REST:     tdee - 500,
    NONE:     tdee - 500,
  }
  const carbPctByLoad: Record<DayLoad, number> = {
    HIGH:     0.50,
    MODERATE: 0.40,
    LOW:      0.30,
    REST:     0.25,
    NONE:     0.25,
  }

  const kcal = Math.max(kcalByLoad[load], 1200)
  const carbKcal = kcal * carbPctByLoad[load]
  const carbsG = Math.round(carbKcal / 4)
  const fatKcal = kcal - proteinKcal - carbKcal
  const fatG = Math.max(Math.round(fatKcal / 9), Math.round(weightKg * 0.5))

  return { kcal, protein: proteinG, carbs: carbsG, fat: fatG }
}
