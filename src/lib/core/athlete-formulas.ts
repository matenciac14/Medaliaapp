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
