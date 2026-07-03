/**
 * BUG-050: test del cálculo de weekData sintético.
 * Cuando el plan tiene menos PlanWeeks en DB que semanas transcurridas,
 * se debe construir una semana sintética con fechas correctas.
 */
import { describe, it, expect } from 'vitest'

// Lógica extraída de checkin/page.tsx
function buildSyntheticWeek(planStartDate: Date, currentWeek: number) {
  const startMs = planStartDate.getTime() + (currentWeek - 1) * 7 * 24 * 60 * 60 * 1000
  return {
    weekNumber: currentWeek,
    startDate: new Date(startMs),
    endDate: new Date(startMs + 6 * 24 * 60 * 60 * 1000),
    sessions: [] as never[],
  }
}

describe('buildSyntheticWeek (BUG-050)', () => {
  it('semana 1 empieza en la misma fecha que el plan', () => {
    const start = new Date('2026-01-05T00:00:00.000Z')
    const week = buildSyntheticWeek(start, 1)
    expect(week.weekNumber).toBe(1)
    expect(week.startDate.toISOString()).toBe(start.toISOString())
    expect(week.sessions).toHaveLength(0)
  })

  it('semana 2 empieza 7 días después del inicio', () => {
    const start = new Date('2026-01-05T00:00:00.000Z')
    const week = buildSyntheticWeek(start, 2)
    const expected = new Date('2026-01-12T00:00:00.000Z')
    expect(week.startDate.toISOString()).toBe(expected.toISOString())
  })

  it('semana 12 tiene fecha de inicio correcta', () => {
    const start = new Date('2026-01-05T00:00:00.000Z')
    const week = buildSyntheticWeek(start, 12)
    // 11 semanas × 7 días = 77 días después del inicio
    const expectedStart = new Date(start.getTime() + 11 * 7 * 24 * 60 * 60 * 1000)
    expect(week.weekNumber).toBe(12)
    expect(week.startDate.toISOString()).toBe(expectedStart.toISOString())
  })

  it('endDate es 6 días después de startDate', () => {
    const start = new Date('2026-01-05T00:00:00.000Z')
    const week = buildSyntheticWeek(start, 3)
    const diffDays = (week.endDate.getTime() - week.startDate.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(6)
  })

  it('weekNumber coincide con el currentWeek solicitado', () => {
    const start = new Date('2026-01-05T00:00:00.000Z')
    for (const w of [1, 4, 8, 12]) {
      const week = buildSyntheticWeek(start, w)
      expect(week.weekNumber).toBe(w)
    }
  })
})
