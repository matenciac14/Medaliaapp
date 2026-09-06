import { describe, it, expect } from 'vitest'
import { computeOverallConversion, computePerCoachConversion, type InviteCodeData } from './invite_conversion'

const base = (overrides: Partial<InviteCodeData> = {}): InviteCodeData => ({
  coachId: 'c1',
  coachName: 'Coach A',
  status: 'activo',
  createdAt: new Date('2026-06-01T10:00:00Z'),
  usedAt: null,
  ...overrides,
})

describe('computeOverallConversion', () => {
  it('calcula tasa correctamente sobre códigos con resultado final', () => {
    const codes = [
      base({ status: 'usado', usedAt: new Date('2026-06-02T10:00:00Z') }),
      base({ status: 'usado', usedAt: new Date('2026-06-03T10:00:00Z') }),
      base({ status: 'vencido' }),
      base({ status: 'activo' }), // excluido del denominador
    ]
    const result = computeOverallConversion(codes)
    expect(result.totalGenerated).toBe(4)
    expect(result.totalUsed).toBe(2)
    expect(result.totalExpiredUnused).toBe(1)
    expect(result.conversionRate).toBe(67) // 2/3 = 66.6 → 67
  })

  it('devuelve conversionRate null si no hay códigos con resultado final', () => {
    const codes = [base({ status: 'activo' }), base({ status: 'activo' })]
    const result = computeOverallConversion(codes)
    expect(result.conversionRate).toBeNull()
  })

  it('conversionRate 100 si todos fueron usados', () => {
    const codes = [
      base({ status: 'usado', usedAt: new Date('2026-06-02T10:00:00Z') }),
      base({ status: 'usado', usedAt: new Date('2026-06-03T10:00:00Z') }),
    ]
    expect(computeOverallConversion(codes).conversionRate).toBe(100)
  })

  it('conversionRate 0 si todos vencieron sin usar', () => {
    const codes = [base({ status: 'vencido' }), base({ status: 'vencido' })]
    expect(computeOverallConversion(codes).conversionRate).toBe(0)
  })

  it('calcula avgHoursToUse correctamente', () => {
    const codes = [
      base({
        status: 'usado',
        createdAt: new Date('2026-06-01T10:00:00Z'),
        usedAt:    new Date('2026-06-02T10:00:00Z'), // 24h
      }),
      base({
        status: 'usado',
        createdAt: new Date('2026-06-01T10:00:00Z'),
        usedAt:    new Date('2026-06-03T10:00:00Z'), // 48h
      }),
    ]
    expect(computeOverallConversion(codes).avgHoursToUse).toBe(36)
  })

  it('devuelve avgHoursToUse null si no hay códigos usados', () => {
    const codes = [base({ status: 'vencido' })]
    expect(computeOverallConversion(codes).avgHoursToUse).toBeNull()
  })

  it('funciona con lista vacía', () => {
    const result = computeOverallConversion([])
    expect(result.totalGenerated).toBe(0)
    expect(result.conversionRate).toBeNull()
    expect(result.avgHoursToUse).toBeNull()
  })
})

describe('computePerCoachConversion', () => {
  it('agrupa correctamente por coach', () => {
    const codes = [
      base({ coachId: 'c1', coachName: 'Coach A', status: 'usado', usedAt: new Date() }),
      base({ coachId: 'c1', coachName: 'Coach A', status: 'vencido' }),
      base({ coachId: 'c2', coachName: 'Coach B', status: 'usado', usedAt: new Date() }),
    ]
    const result = computePerCoachConversion(codes)
    expect(result).toHaveLength(2)

    const coachA = result.find((r) => r.coachId === 'c1')!
    expect(coachA.generated).toBe(2)
    expect(coachA.used).toBe(1)
    expect(coachA.expiredUnused).toBe(1)
    expect(coachA.conversionRate).toBe(50)

    const coachB = result.find((r) => r.coachId === 'c2')!
    expect(coachB.conversionRate).toBe(100)
  })

  it('conversionRate null si todos los códigos del coach están activos', () => {
    const codes = [base({ coachId: 'c1', status: 'activo' })]
    const result = computePerCoachConversion(codes)
    expect(result[0].conversionRate).toBeNull()
  })

  it('ordena por cantidad generada descendente', () => {
    const codes = [
      base({ coachId: 'c1', status: 'activo' }),
      base({ coachId: 'c2', status: 'activo' }),
      base({ coachId: 'c2', status: 'activo' }),
      base({ coachId: 'c2', status: 'activo' }),
    ]
    const result = computePerCoachConversion(codes)
    expect(result[0].coachId).toBe('c2') // más generados primero
  })
})
