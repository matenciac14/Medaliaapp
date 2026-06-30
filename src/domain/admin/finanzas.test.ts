import { describe, it, expect } from 'vitest'
import { coachFeeRate, feeLabel, mrrAthletes, mrrCoaches, ATHLETE_PRO_PRICE_USD } from './finanzas'

// ---------------------------------------------------------------------------
// coachFeeRate — tramos de fee
// ---------------------------------------------------------------------------
describe('coachFeeRate', () => {
  it('0 atletas → fee 0', () => {
    expect(coachFeeRate(0)).toBe(0)
  })

  it('número negativo → fee 0', () => {
    expect(coachFeeRate(-5)).toBe(0)
  })

  it('tramo 1 — 1 atleta → $6', () => {
    expect(coachFeeRate(1)).toBe(6)
  })

  it('tramo 1 — 25 atletas → $150', () => {
    expect(coachFeeRate(25)).toBe(150)
  })

  it('tramo 1 — 50 atletas (límite) → $300', () => {
    expect(coachFeeRate(50)).toBe(300)
  })

  it('tramo 2 — 51 atletas → $305 (300 + 1×5)', () => {
    expect(coachFeeRate(51)).toBe(305)
  })

  it('tramo 2 — 75 atletas → $425 (300 + 25×5)', () => {
    expect(coachFeeRate(75)).toBe(425)
  })

  it('tramo 2 — 100 atletas (límite) → $550 (300 + 50×5)', () => {
    expect(coachFeeRate(100)).toBe(550)
  })

  it('tramo 3 — 101 atletas → $553 (550 + 1×3)', () => {
    expect(coachFeeRate(101)).toBe(553)
  })

  it('tramo 3 — 200 atletas → $850 (550 + 100×3)', () => {
    expect(coachFeeRate(200)).toBe(850)
  })
})

// ---------------------------------------------------------------------------
// feeLabel — etiqueta de tramo
// ---------------------------------------------------------------------------
describe('feeLabel', () => {
  it('0 atletas → "—"', () => {
    expect(feeLabel(0)).toBe('—')
  })

  it('tramo 1 (1-50) → "$6/atleta"', () => {
    expect(feeLabel(1)).toBe('$6/atleta')
    expect(feeLabel(50)).toBe('$6/atleta')
  })

  it('tramo 2 (51-100) → "$5/atleta (>50)"', () => {
    expect(feeLabel(51)).toBe('$5/atleta (>50)')
    expect(feeLabel(100)).toBe('$5/atleta (>50)')
  })

  it('tramo 3 (+100) → "$3/atleta (>100)"', () => {
    expect(feeLabel(101)).toBe('$3/atleta (>100)')
    expect(feeLabel(500)).toBe('$3/atleta (>100)')
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
