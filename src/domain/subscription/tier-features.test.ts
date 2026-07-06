import { describe, it, expect } from 'vitest'
import { computeAthleteFeatures, getCoachLimits } from './tier-features'

// ─── computeAthleteFeatures ───────────────────────────────────────────────────

describe('computeAthleteFeatures — PRO', () => {
  it('tiene acceso completo excepto coach', () => {
    const f = computeAthleteFeatures('PRO')
    expect(f.plan).toBe(true)
    expect(f.checkin).toBe(true)
    expect(f.nutrition).toBe(true)
    expect(f.progress).toBe(true)
    expect(f.log).toBe(true)
    expect(f.gym).toBe(true)
    expect(f.coach).toBe(false)
  })
})

describe('computeAthleteFeatures — FREE', () => {
  // FREE = capa de tracking: log, nutrición, gym — SIN plan adaptativo ni inteligencia
  it('tiene acceso a log, nutrition y gym', () => {
    const f = computeAthleteFeatures('FREE')
    expect(f.log).toBe(true)
    expect(f.nutrition).toBe(true)
    expect(f.gym).toBe(true)
  })

  it('no tiene acceso a plan, checkin ni progress (gate de pago)', () => {
    const f = computeAthleteFeatures('FREE')
    expect(f.plan).toBe(false)
    expect(f.checkin).toBe(false)
    expect(f.progress).toBe(false)
    expect(f.coach).toBe(false)
  })
})

// ─── getCoachLimits ───────────────────────────────────────────────────────────

describe('getCoachLimits — límites correctos por tier', () => {
  it('STARTER: máximo 5 asesorados', () => {
    expect(getCoachLimits('STARTER').maxAthletes).toBe(5)
  })

  it('GROWTH: máximo 25 asesorados', () => {
    expect(getCoachLimits('GROWTH').maxAthletes).toBe(25)
  })

  it('PRO: máximo 75 asesorados', () => {
    expect(getCoachLimits('PRO').maxAthletes).toBe(75)
  })

  it('SCALE: sin límite (Infinity)', () => {
    expect(getCoachLimits('SCALE').maxAthletes).toBe(Infinity)
  })
})

describe('getCoachLimits — enforcement pattern', () => {
  it('STARTER con 5 activos bloquea (activeCount >= maxAthletes)', () => {
    const { maxAthletes } = getCoachLimits('STARTER')
    expect(5 >= maxAthletes).toBe(true)
  })

  it('STARTER con 4 activos permite agregar', () => {
    const { maxAthletes } = getCoachLimits('STARTER')
    expect(4 >= maxAthletes).toBe(false)
  })

  it('SCALE nunca bloquea independientemente de la cantidad', () => {
    const { maxAthletes } = getCoachLimits('SCALE')
    expect(10_000 >= maxAthletes).toBe(false)
  })

  it('GROWTH con 25 activos bloquea', () => {
    const { maxAthletes } = getCoachLimits('GROWTH')
    expect(25 >= maxAthletes).toBe(true)
  })
})
