import { describe, it, expect } from 'vitest'
import { getPlanWeekNumber, getInitialWeekIdx } from './week-number'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// ── getPlanWeekNumber ──────────────────────────────────────────────────────────

describe('getPlanWeekNumber', () => {
  it('retorna 1 si el plan empezó hoy', () => {
    expect(getPlanWeekNumber(new Date())).toBe(1)
  })

  it('retorna 1 en el día 6 (aún primera semana)', () => {
    expect(getPlanWeekNumber(daysAgo(6))).toBe(1)
  })

  it('retorna 2 al cumplir 7 días', () => {
    expect(getPlanWeekNumber(daysAgo(7))).toBe(2)
  })

  it('retorna 3 al cumplir 14 días', () => {
    expect(getPlanWeekNumber(daysAgo(14))).toBe(3)
  })

  it('clampea al máximo si totalWeeks es menor al calculado', () => {
    expect(getPlanWeekNumber(daysAgo(70), 8)).toBe(8)
  })

  it('nunca retorna menos de 1, incluso si la fecha es futura', () => {
    expect(getPlanWeekNumber(daysFromNow(7))).toBe(1)
  })

  it('respeta totalWeeks cuando el cálculo está dentro del rango', () => {
    expect(getPlanWeekNumber(daysAgo(14), 12)).toBe(3)
  })
})

// ── getInitialWeekIdx ──────────────────────────────────────────────────────────

function makePlan(startDate: Date, totalWeeks: number) {
  return {
    startDate: startDate.toISOString(),
    totalWeeks,
    weeks: Array.from({ length: totalWeeks }, (_, i) => ({ id: String(i) })),
  }
}

describe('getInitialWeekIdx', () => {
  it('retorna 0 si plan es null', () => {
    expect(getInitialWeekIdx(null)).toBe(0)
  })

  it('retorna 0 si el plan no tiene semanas', () => {
    expect(getInitialWeekIdx({ startDate: new Date().toISOString(), totalWeeks: 12, weeks: [] })).toBe(0)
  })

  it('retorna 0 si el plan comenzó hoy (semana 1, índice 0)', () => {
    expect(getInitialWeekIdx(makePlan(new Date(), 12))).toBe(0)
  })

  it('retorna 1 para la semana 2 (7 días desde inicio)', () => {
    expect(getInitialWeekIdx(makePlan(daysAgo(7), 12))).toBe(1)
  })

  it('retorna 2 para la semana 3 (14 días desde inicio)', () => {
    expect(getInitialWeekIdx(makePlan(daysAgo(14), 12))).toBe(2)
  })

  it('retorna 4 para la semana 5 (28 días desde inicio)', () => {
    expect(getInitialWeekIdx(makePlan(daysAgo(28), 12))).toBe(4)
  })

  it('clampea al índice máximo cuando la semana supera el total del plan', () => {
    expect(getInitialWeekIdx(makePlan(daysAgo(70), 8))).toBe(7)
  })

  it('nunca retorna índice negativo (plan con fecha futura)', () => {
    expect(getInitialWeekIdx(makePlan(daysFromNow(7), 12))).toBeGreaterThanOrEqual(0)
  })

  it('el índice retornado nunca supera weeks.length - 1', () => {
    const plan = makePlan(daysAgo(200), 4)
    expect(getInitialWeekIdx(plan)).toBeLessThanOrEqual(plan.weeks.length - 1)
  })

  it('acepta startDate como Date o como string ISO', () => {
    const date = daysAgo(14)
    const planWithString = { startDate: date.toISOString(), totalWeeks: 12, weeks: Array.from({ length: 12 }, (_, i) => ({ id: String(i) })) }
    const planWithDate = { startDate: date as unknown as string, totalWeeks: 12, weeks: planWithString.weeks }
    expect(getInitialWeekIdx(planWithString)).toBe(getInitialWeekIdx(planWithDate))
  })
})
