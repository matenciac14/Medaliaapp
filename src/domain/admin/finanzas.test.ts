import { describe, it, expect } from 'vitest'
import { coachTierFee, coachTierFeeLabel, mrrAthletes, mrrCoaches, ATHLETE_PRO_PRICE_USD } from './finanzas'

// ---------------------------------------------------------------------------
// coachTierFee — tier plano
// ---------------------------------------------------------------------------
describe('coachTierFee', () => {
  it('STARTER → $0', () => {
    expect(coachTierFee('STARTER')).toBe(0)
    expect(coachTierFee('STARTER', 5)).toBe(0)
  })

  it('GROWTH → $39', () => {
    expect(coachTierFee('GROWTH')).toBe(39)
    expect(coachTierFee('GROWTH', 20)).toBe(39)
  })

  it('PRO → $79', () => {
    expect(coachTierFee('PRO')).toBe(79)
    expect(coachTierFee('PRO', 75)).toBe(79)
  })

  it('SCALE ≤100 atletas → $129', () => {
    expect(coachTierFee('SCALE')).toBe(129)
    expect(coachTierFee('SCALE', 100)).toBe(129)
  })

  it('SCALE 110 atletas → $129 + 10×$1.5 = $144', () => {
    expect(coachTierFee('SCALE', 110)).toBeCloseTo(144)
  })

  it('SCALE 200 atletas → $129 + 100×$1.5 = $279', () => {
    expect(coachTierFee('SCALE', 200)).toBeCloseTo(279)
  })
})

// ---------------------------------------------------------------------------
// coachTierFeeLabel — etiqueta de tier
// ---------------------------------------------------------------------------
describe('coachTierFeeLabel', () => {
  it('STARTER → "Starter — $0/mes"', () => {
    expect(coachTierFeeLabel('STARTER')).toBe('Starter — $0/mes')
  })

  it('GROWTH → "Growth — $39/mes"', () => {
    expect(coachTierFeeLabel('GROWTH')).toBe('Growth — $39/mes')
  })

  it('PRO → "Pro — $79/mes"', () => {
    expect(coachTierFeeLabel('PRO')).toBe('Pro — $79/mes')
  })

  it('SCALE ≤100 → "Scale — $129/mes"', () => {
    expect(coachTierFeeLabel('SCALE', 100)).toBe('Scale — $129/mes')
  })

  it('SCALE 110 → incluye extra', () => {
    expect(coachTierFeeLabel('SCALE', 110)).toContain('Scale+')
  })
})

// ---------------------------------------------------------------------------
// mrrAthletes — MRR de atletas Pro
// ---------------------------------------------------------------------------
describe('mrrAthletes', () => {
  it('0 atletas Pro → 0', () => {
    expect(mrrAthletes(0)).toBe(0)
  })

  it('10 atletas Pro → 10 × precio unitario', () => {
    expect(mrrAthletes(10)).toBeCloseTo(10 * ATHLETE_PRO_PRICE_USD)
  })
})

// ---------------------------------------------------------------------------
// mrrCoaches — suma de fees de coaches
// ---------------------------------------------------------------------------
describe('mrrCoaches', () => {
  it('lista vacía → 0', () => {
    expect(mrrCoaches([])).toBe(0)
  })

  it('suma correctamente los fees de distintos coaches', () => {
    expect(mrrCoaches([300, 550, 0, 150])).toBe(1000)
  })
})
