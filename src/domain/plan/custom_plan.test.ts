import { describe, it, expect } from 'vitest'
import { buildCustomPlanWeeks, calcPlanEndDate, resolvePhase } from './custom_plan'

// ── Helpers ──────────────────────────────────────────────────────────────────

const START = new Date('2026-07-07') // lunes

function daysDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

// ── calcPlanEndDate ───────────────────────────────────────────────────────────

describe('calcPlanEndDate', () => {
  it('plan de 1 semana termina 7 días después del inicio', () => {
    const end = calcPlanEndDate(START, 1)
    expect(daysDiff(START, end)).toBe(7)
  })

  it('plan de 12 semanas termina 84 días después del inicio', () => {
    const end = calcPlanEndDate(START, 12)
    expect(daysDiff(START, end)).toBe(84)
  })

  it('plan de 18 semanas termina 126 días después', () => {
    const end = calcPlanEndDate(START, 18)
    expect(daysDiff(START, end)).toBe(126)
  })

  it('no muta el objeto startDate original', () => {
    const original = new Date(START)
    calcPlanEndDate(START, 8)
    expect(START.getTime()).toBe(original.getTime())
  })
})

// ── resolvePhase ──────────────────────────────────────────────────────────────

describe('resolvePhase — asignación automática de fases', () => {
  it('semanas 1-2 (índice 0-1) son BASE', () => {
    expect(resolvePhase(0)).toBe('BASE')
    expect(resolvePhase(1)).toBe('BASE')
  })

  it('semanas 3-4 (índice 2-3) son DESARROLLO', () => {
    expect(resolvePhase(2)).toBe('DESARROLLO')
    expect(resolvePhase(3)).toBe('DESARROLLO')
  })

  it('semanas 5-6 (índice 4-5) son ESPECIFICO', () => {
    expect(resolvePhase(4)).toBe('ESPECIFICO')
    expect(resolvePhase(5)).toBe('ESPECIFICO')
  })

  it('semanas 7-8 (índice 6-7) son AFINAMIENTO', () => {
    expect(resolvePhase(6)).toBe('AFINAMIENTO')
    expect(resolvePhase(7)).toBe('AFINAMIENTO')
  })

  it('más de 8 semanas → ciclo vuelve a BASE', () => {
    expect(resolvePhase(8)).toBe('BASE')   // semana 9
    expect(resolvePhase(9)).toBe('BASE')   // semana 10
    expect(resolvePhase(10)).toBe('DESARROLLO') // semana 11
  })

  it('cualquier semana fuera del ciclo devuelve BASE como fallback', () => {
    // El ciclo tiene 8 entradas; índices >= 8 reciclan a BASE hasta que el ciclo los cubra
    // Verificamos que nunca devuelva undefined
    for (let i = 0; i < 52; i++) {
      expect(resolvePhase(i)).toBeTruthy()
    }
  })
})

// ── buildCustomPlanWeeks ──────────────────────────────────────────────────────

describe('buildCustomPlanWeeks — estructura', () => {
  it('devuelve exactamente totalWeeks semanas', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 12)
    expect(weeks).toHaveLength(12)
  })

  it('weekNumber empieza en 1 y es consecutivo', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 6)
    weeks.forEach((w, i) => expect(w.weekNumber).toBe(i + 1))
  })

  it('todas las semanas tienen planId correcto', () => {
    const weeks = buildCustomPlanWeeks('my-plan-id', START, 4)
    weeks.forEach(w => expect(w.planId).toBe('my-plan-id'))
  })

  it('todas las semanas inician con isRecoveryWeek = false', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 8)
    weeks.forEach(w => expect(w.isRecoveryWeek).toBe(false))
  })

  it('focusDescription es null en todas las semanas', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 4)
    weeks.forEach(w => expect(w.focusDescription).toBeNull())
  })
})

describe('buildCustomPlanWeeks — fechas', () => {
  it('semana 1 comienza en la fecha de inicio dada', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 4)
    expect(weeks[0].startDate.getTime()).toBe(START.getTime())
  })

  it('cada semana empieza 7 días después de la anterior', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 8)
    for (let i = 1; i < weeks.length; i++) {
      const diff = daysDiff(weeks[i - 1].startDate, weeks[i].startDate)
      expect(diff).toBe(7)
    }
  })

  it('endDate de cada semana es 6 días después de su startDate', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 6)
    weeks.forEach(w => {
      expect(daysDiff(w.startDate, w.endDate)).toBe(6)
    })
  })

  it('semanas no se solapan — endDate de semana N < startDate de semana N+1', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 8)
    for (let i = 0; i + 1 < weeks.length; i++) {
      expect(weeks[i].endDate.getTime()).toBeLessThan(weeks[i + 1].startDate.getTime())
    }
  })

  it('no muta el objeto startDate original', () => {
    const original = new Date(START)
    buildCustomPlanWeeks('plan-1', START, 12)
    expect(START.getTime()).toBe(original.getTime())
  })

  it('startDate de la última semana = inicio + (n-1)*7 días', () => {
    const n = 12
    const weeks = buildCustomPlanWeeks('plan-1', START, n)
    const expected = new Date(START)
    expected.setDate(expected.getDate() + (n - 1) * 7)
    expect(weeks[n - 1].startDate.getTime()).toBe(expected.getTime())
  })
})

describe('buildCustomPlanWeeks — fases', () => {
  it('plan de 4 semanas: BASE, BASE, DESARROLLO, DESARROLLO', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 4)
    expect(weeks.map(w => w.phase)).toEqual(['BASE', 'BASE', 'DESARROLLO', 'DESARROLLO'])
  })

  it('plan de 8 semanas: dos semanas de cada fase', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 8)
    expect(weeks.map(w => w.phase)).toEqual([
      'BASE', 'BASE',
      'DESARROLLO', 'DESARROLLO',
      'ESPECIFICO', 'ESPECIFICO',
      'AFINAMIENTO', 'AFINAMIENTO',
    ])
  })

  it('plan de 12 semanas: ciclo completo + inicio del segundo ciclo', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 12)
    expect(weeks[8].phase).toBe('BASE')       // semana 9 reinicia
    expect(weeks[9].phase).toBe('BASE')       // semana 10
    expect(weeks[10].phase).toBe('DESARROLLO') // semana 11
    expect(weeks[11].phase).toBe('DESARROLLO') // semana 12
  })

  it('plan de 1 semana: solo BASE', () => {
    const weeks = buildCustomPlanWeeks('plan-1', START, 1)
    expect(weeks[0].phase).toBe('BASE')
  })

  it('todas las fases son valores válidos del enum', () => {
    const valid = new Set(['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO'])
    const weeks = buildCustomPlanWeeks('plan-1', START, 24)
    weeks.forEach(w => expect(valid.has(w.phase)).toBe(true))
  })
})

// ── Integración: plan de 18 semanas (caso más común) ─────────────────────────

describe('buildCustomPlanWeeks — plan 18 semanas (caso HM)', () => {
  const weeks = buildCustomPlanWeeks('plan-hm', START, 18)

  it('tiene 18 semanas', () => expect(weeks).toHaveLength(18))

  it('cubre exactamente 126 días (18×7)', () => {
    const firstDay = weeks[0].startDate
    const lastDay  = weeks[17].endDate
    expect(daysDiff(firstDay, lastDay)).toBe(125) // 18 semanas × 7 días - 1
  })

  it('distribución de fases correcta para 18 semanas', () => {
    const phaseCounts = weeks.reduce<Record<string, number>>((acc, w) => {
      acc[w.phase] = (acc[w.phase] ?? 0) + 1
      return acc
    }, {})
    // Ciclo de 8 se repite: 2 ciclos completos = 16 + 2 semanas extra de BASE
    expect(phaseCounts['BASE']).toBe(6)       // 2+2+2
    expect(phaseCounts['DESARROLLO']).toBe(4) // 2+2
    expect(phaseCounts['ESPECIFICO']).toBe(4) // 2+2
    expect(phaseCounts['AFINAMIENTO']).toBe(4) // 2+2
  })
})
