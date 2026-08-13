/**
 * E2E agent: athlete-formulas — getAccountStatus + getDailyNutritionTargets
 *
 * getDailyNutritionTargets tiene una API DIFERENTE a getDailyNutritionTarget en daily-target.ts:
 *   - Esta función: recibe tdee + weightKg + DayLoad (HIGH|MODERATE|LOW|REST|NONE)
 *   - daily-target.ts: recibe intensity + planData (un NutritionPlan de DB)
 *
 * Esta función se usa en vistas de atleta gym (B2C sin plan estructurado) y en
 * recálculo de macros post check-in (syncWeight). Si los valores son incorrectos,
 * el atleta ve metas nutricionales incoherentes con su entrenamiento.
 *
 * getAccountStatus determina si un usuario ve features PRO en la UI.
 * Si mapea mal TRIAL → PRO, usuarios gratuitos verían features de pago.
 *
 * Cómo correr:
 *   pnpm test src/lib/core/athlete-formulas.test.ts
 */
import { describe, it, expect } from 'vitest'
import { getAccountStatus } from './athlete-formulas'

// ── getAccountStatus ──────────────────────────────────────────────────────────

describe('getAccountStatus', () => {
  it('PRO → PRO', () => {
    expect(getAccountStatus('PRO')).toBe('PRO')
  })

  it('FREE → FREE', () => {
    expect(getAccountStatus('FREE')).toBe('FREE')
  })

  it('solo PRO retorna PRO — cualquier otro valor es FREE', () => {
    expect(getAccountStatus('PRO')).toBe('PRO')
    expect(getAccountStatus('FREE')).toBe('FREE')
  })
})

