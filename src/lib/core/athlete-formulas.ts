// ---------------------------------------------------------------------------
// athlete-formulas.ts — Capa determinista sin dependencia de AI
// Todas las funciones son puras: mismos inputs → mismos outputs.
// Importar desde aquí garantiza cero llamadas a Anthropic.
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

import type { UserConfig, UserPlan } from '@/lib/config/user-config'

// ---------------------------------------------------------------------------
// Estado de cuenta — determina TRIAL / PRO / INACTIVE sin leer la DB
// ---------------------------------------------------------------------------

export type AccountStatus = 'TRIAL_ACTIVE' | 'TRIAL_EXPIRED' | 'PRO' | 'INACTIVE'

/**
 * Determina el estado real de la cuenta a partir del JWT/config.
 * No hace llamadas externas — pura lógica de fechas.
 */
export function getAccountStatus(
  userPlan: UserPlan,
  trialEndsAt: string | null,
  now: Date = new Date()
): AccountStatus {
  if (userPlan === 'PRO') return 'PRO'
  if (userPlan === 'INACTIVE') return 'INACTIVE'
  // TRIAL
  if (!trialEndsAt) return 'TRIAL_ACTIVE'
  return new Date(trialEndsAt) >= now ? 'TRIAL_ACTIVE' : 'TRIAL_EXPIRED'
}

/**
 * Devuelve cuántos días quedan de trial. Negativo = ya expiró.
 */
export function trialDaysRemaining(trialEndsAt: string | null, now: Date = new Date()): number {
  if (!trialEndsAt) return 0
  const diff = new Date(trialEndsAt).getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ---------------------------------------------------------------------------
// AI allowance — cuántos mensajes quedan este mes
// ---------------------------------------------------------------------------

export type AIAllowance = {
  remaining: number      // mensajes disponibles (-1 = ilimitado)
  limit: number          // límite mensual configurado
  isUnlimited: boolean
}

/**
 * Calcula mensajes AI disponibles a partir del config del usuario.
 * No consulta la DB — usa los valores del JWT/config ya cargado.
 */
export function getAIAllowance(ai: UserConfig['ai']): AIAllowance {
  const { monthlyLimit, messagesThisMonth } = ai
  if (monthlyLimit >= 999999) {
    return { remaining: -1, limit: monthlyLimit, isUnlimited: true }
  }
  return {
    remaining: Math.max(0, monthlyLimit - messagesThisMonth),
    limit: monthlyLimit,
    isUnlimited: false,
  }
}

// ---------------------------------------------------------------------------
// Nutrición por día — reflejo del entrenamiento sin AI
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
