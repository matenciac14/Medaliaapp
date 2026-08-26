import { describe, it, expect, beforeEach } from 'vitest'
import { generateSuggestions, type SuggestionGenerationContext } from './generate-suggestions'

const BASE_CONTEXT: SuggestionGenerationContext = {
  planId: 'plan-1',
  nextWeek: 4,
  phase: 'BASE',
  currentWeek: 3,
  totalWeeks: 12,
}

describe('generateSuggestions — sin triggers', () => {
  it('retorna array vacío cuando no hay triggers', () => {
    expect(generateSuggestions([], [], BASE_CONTEXT)).toHaveLength(0)
  })
})

describe('generateSuggestions — RECOVERY_WEEK', () => {
  it('fatiga_acumulada → genera sugerencia RECOVERY_WEEK', () => {
    const result = generateSuggestions(
      ['fatiga_acumulada', 'energia_baja', 'rpe_excesivo'],
      ['Reducir intensidad'],
      BASE_CONTEXT
    )
    const rw = result.find(s => s.type === 'RECOVERY_WEEK')
    expect(rw).toBeDefined()
    expect(rw?.payload).toMatchObject({ planId: 'plan-1', nextWeek: 4 })
  })

  it('sin fatiga_acumulada → no genera RECOVERY_WEEK', () => {
    const result = generateSuggestions(['energia_baja'], ['Ajustar'], BASE_CONTEXT)
    expect(result.find(s => s.type === 'RECOVERY_WEEK')).toBeUndefined()
  })
})

describe('generateSuggestions — NUTRITION_CHANGE', () => {
  it('perdida_peso_rapida → genera sugerencia NUTRITION_CHANGE', () => {
    const result = generateSuggestions(
      ['perdida_peso_rapida'],
      ['Revisar ingesta calórica'],
      { ...BASE_CONTEXT, previousWeight: 72 }
    )
    const nc = result.find(s => s.type === 'NUTRITION_CHANGE')
    expect(nc).toBeDefined()
    expect(nc?.payload).toMatchObject({ trigger: 'perdida_peso_rapida', previousWeight: 72 })
  })
})

describe('generateSuggestions — GYM_DELOAD', () => {
  it('energia_baja + 2 semanas consecutivas → GYM_DELOAD', () => {
    const result = generateSuggestions(
      ['energia_baja'],
      ['Energía baja — reducir carga'],
      { ...BASE_CONTEXT, consecutiveLowEnergyWeeks: 2 }
    )
    expect(result.find(s => s.type === 'GYM_DELOAD')).toBeDefined()
  })

  it('energia_baja + 1 semana → no GYM_DELOAD, solo PLAN_ADJUSTMENT', () => {
    const result = generateSuggestions(
      ['energia_baja'],
      ['Energía baja — reducir carga'],
      { ...BASE_CONTEXT, consecutiveLowEnergyWeeks: 1 }
    )
    expect(result.find(s => s.type === 'GYM_DELOAD')).toBeUndefined()
    expect(result.find(s => s.type === 'PLAN_ADJUSTMENT')).toBeDefined()
  })

  it('gym_sobrecarga → GYM_DELOAD (CI-B-03)', () => {
    const result = generateSuggestions(
      ['gym_sobrecarga'],
      ['RPE de gym elevado — considera reducir volumen'],
      BASE_CONTEXT
    )
    const deload = result.find(s => s.type === 'GYM_DELOAD')
    expect(deload).toBeDefined()
    expect(deload?.description).toMatch(/RPE de gym elevado/)
  })

  it('gym_sobrecarga no genera PLAN_ADJUSTMENT (queda consumido por GYM_DELOAD)', () => {
    const result = generateSuggestions(
      ['gym_sobrecarga'],
      ['RPE de gym elevado'],
      BASE_CONTEXT
    )
    expect(result.find(s => s.type === 'PLAN_ADJUSTMENT')).toBeUndefined()
  })

  it('gym_sobrecarga + fatiga_acumulada → GYM_DELOAD + RECOVERY_WEEK', () => {
    const result = generateSuggestions(
      ['fatiga_acumulada', 'gym_sobrecarga'],
      ['Fatiga acumulada', 'RPE elevado'],
      BASE_CONTEXT
    )
    const types = result.map(s => s.type)
    expect(types).toContain('RECOVERY_WEEK')
    expect(types).toContain('GYM_DELOAD')
  })
})

describe('generateSuggestions — PLAN_ADJUSTMENT', () => {
  const planTriggers = ['dolor_activo', 'rpe_excesivo', 'estres_alto', 'sueno_bajo', 'fc_alta']

  planTriggers.forEach(trigger => {
    it(`${trigger} → genera PLAN_ADJUSTMENT`, () => {
      const result = generateSuggestions([trigger], ['Ajuste'], BASE_CONTEXT)
      expect(result.find(s => s.type === 'PLAN_ADJUSTMENT')).toBeDefined()
    })
  })

  it('payload incluye planId, nextWeek y triggers', () => {
    const result = generateSuggestions(
      ['dolor_activo'],
      ['Sesiones convertidas a recuperación'],
      BASE_CONTEXT
    )
    const pa = result.find(s => s.type === 'PLAN_ADJUSTMENT')
    expect(pa?.payload).toMatchObject({ planId: 'plan-1', nextWeek: 4 })
    expect(Array.isArray((pa?.payload as any).triggers)).toBe(true)
  })
})

describe('generateSuggestions — expiresAt', () => {
  it('expiresAt es ~7 días desde ahora', () => {
    const before = Date.now()
    const result = generateSuggestions(['dolor_activo'], ['Ajuste'], BASE_CONTEXT)
    const after = Date.now()
    const exp = result[0].expiresAt.getTime()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    expect(exp).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000)
    expect(exp).toBeLessThanOrEqual(after + sevenDaysMs + 1000)
  })
})

describe('generateSuggestions — combinaciones', () => {
  it('fatiga + perdida_peso + dolor → RECOVERY_WEEK + NUTRITION_CHANGE + PLAN_ADJUSTMENT', () => {
    const result = generateSuggestions(
      ['fatiga_acumulada', 'perdida_peso_rapida', 'dolor_activo'],
      ['Múltiples señales', 'Revisar ingesta', 'Dolor activo'],
      BASE_CONTEXT
    )
    const types = result.map(s => s.type)
    expect(types).toContain('RECOVERY_WEEK')
    expect(types).toContain('NUTRITION_CHANGE')
    expect(types).toContain('PLAN_ADJUSTMENT')
  })
})
