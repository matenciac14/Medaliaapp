import { describe, it, expect } from 'vitest'
import { getInitialWeekIdx } from '@/lib/core/week-number'

// Stub mínimo de BuilderPlan para los tests
function makePlan(startDate: string, totalWeeks: number): { startDate: string; totalWeeks: number; weeks: { id: string }[] } {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => ({ id: String(i) }))
  return { startDate, totalWeeks, weeks }
}

function isoDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

describe('getInitialWeekIdx', () => {
  it('retorna 0 si plan es null', () => {
    expect(getInitialWeekIdx(null)).toBe(0)
  })

  it('retorna 0 si el plan no tiene semanas', () => {
    const plan = { startDate: new Date().toISOString(), totalWeeks: 12, weeks: [] }
    expect(getInitialWeekIdx(plan)).toBe(0)
  })

  it('retorna 0 si el plan comenzó hoy (semana 1, índice 0)', () => {
    const plan = makePlan(new Date().toISOString(), 12)
    expect(getInitialWeekIdx(plan)).toBe(0)
  })

  it('retorna el índice correcto para la semana 3 (14 días desde inicio)', () => {
    const plan = makePlan(isoDateDaysAgo(14), 12)
    // 14 días = semana 3 → índice 2
    expect(getInitialWeekIdx(plan)).toBe(2)
  })

  it('retorna el índice correcto para la semana 5 (28 días desde inicio)', () => {
    const plan = makePlan(isoDateDaysAgo(28), 12)
    // 28 días = semana 5 → índice 4
    expect(getInitialWeekIdx(plan)).toBe(4)
  })

  it('clampea al máximo índice cuando la semana actual supera el total', () => {
    // Plan de 8 semanas que empezó hace 70 días (semana 11 calculada, pero solo hay 8)
    const plan = makePlan(isoDateDaysAgo(70), 8)
    expect(getInitialWeekIdx(plan)).toBe(7) // índice máximo = totalWeeks - 1
  })

  it('nunca retorna un índice negativo', () => {
    // Fecha en el futuro (plan que aún no empieza)
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const plan = makePlan(future.toISOString(), 12)
    expect(getInitialWeekIdx(plan)).toBeGreaterThanOrEqual(0)
  })

  it('el índice retornado nunca supera weeks.length - 1', () => {
    const plan = makePlan(isoDateDaysAgo(200), 4)
    const idx = getInitialWeekIdx(plan)
    expect(idx).toBeLessThanOrEqual(plan.weeks.length - 1)
  })
})
