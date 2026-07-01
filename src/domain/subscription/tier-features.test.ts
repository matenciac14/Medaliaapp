import { describe, it, expect } from 'vitest'
import { computeAthleteFeatures, getCoachLimits } from './tier-features'

// ─── computeAthleteFeatures ───────────────────────────────────────────────────

describe('computeAthleteFeatures — TRIAL', () => {
  it('tiene acceso completo', () => {
    const f = computeAthleteFeatures('TRIAL')
    expect(f.plan).toBe(true)
    expect(f.checkin).toBe(true)
    expect(f.nutrition).toBe(true)
    expect(f.progress).toBe(true)
    expect(f.log).toBe(true)
    expect(f.gym).toBe(true)
  })

  it('nunca tiene acceso al panel de coach', () => {
    expect(computeAthleteFeatures('TRIAL').coach).toBe(false)
  })
})

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
  it('solo tiene acceso a log manual', () => {
    const f = computeAthleteFeatures('FREE')
    expect(f.log).toBe(true)
  })

  it('no tiene acceso a plan, checkin, nutrition, progress, gym ni coach', () => {
    const f = computeAthleteFeatures('FREE')
    expect(f.plan).toBe(false)
    expect(f.checkin).toBe(false)
    expect(f.nutrition).toBe(false)
    expect(f.progress).toBe(false)
    expect(f.gym).toBe(false)
    expect(f.coach).toBe(false)
  })
})

describe('computeAthleteFeatures — paridad TRIAL vs PRO', () => {
  it('TRIAL y PRO producen las mismas features', () => {
    expect(computeAthleteFeatures('TRIAL')).toEqual(computeAthleteFeatures('PRO'))
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
