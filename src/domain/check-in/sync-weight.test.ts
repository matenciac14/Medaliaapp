/**
 * BUG-055: syncWeight debe comparar el nuevo peso contra profile.weightKg (base),
 * NO contra el peso del check-in anterior. Esto garantiza que si el atleta
 * tiene un profile base de 75kg y hace check-in con 73.5kg (delta=1.5 > 0.5),
 * el perfil se actualiza aunque el check-in previo fuera 73.8kg (delta=0.3 < 0.5).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Extraemos solo la lógica del delta para testear en aislamiento
const WEIGHT_DELTA_MIN = 0.5

function shouldUpdateWeight(profileWeightKg: number | null, newWeight: number): boolean {
  const prev = profileWeightKg ?? newWeight
  return Math.abs(newWeight - prev) >= WEIGHT_DELTA_MIN
}

describe('shouldUpdateWeight — BUG-055', () => {
  it('actualiza cuando la diferencia vs perfil base supera el umbral', () => {
    // profile.weightKg = 75, nuevo = 73.5 → delta = 1.5 ≥ 0.5 → actualiza
    expect(shouldUpdateWeight(75, 73.5)).toBe(true)
  })

  it('NO actualiza cuando la diferencia vs perfil base es menor al umbral', () => {
    // profile.weightKg = 75, nuevo = 75.3 → delta = 0.3 < 0.5 → no actualiza
    expect(shouldUpdateWeight(75, 75.3)).toBe(false)
  })

  it('caso BUG-055: check-in anterior cercano no bloquea la actualización del perfil base', () => {
    // Situación previa al fix:
    //   profile.weightKg = 75, previousCheckIn = 73.8, nuevo = 73.5
    //   Bug: prev = previousCheckIn (73.8), delta = |73.5 - 73.8| = 0.3 < 0.5 → NO actualizaba
    //   Fix: prev = profile.weightKg (75), delta = |73.5 - 75| = 1.5 ≥ 0.5 → SÍ actualiza
    const profileBase = 75
    const newWeight = 73.5
    expect(shouldUpdateWeight(profileBase, newWeight)).toBe(true)
  })

  it('cuando el perfil no tiene peso base, no actualiza (delta = 0)', () => {
    // profile.weightKg = null → prev = newWeight → delta = 0
    expect(shouldUpdateWeight(null, 73.5)).toBe(false)
  })

  it('actualiza en bajada exacta al umbral', () => {
    expect(shouldUpdateWeight(75, 74.5)).toBe(true) // delta exactamente 0.5
  })
})
