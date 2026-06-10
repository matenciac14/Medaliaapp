import { describe, it, expect } from 'vitest'
import { getDailyNutritionTarget, type NutritionPlanTargets } from './daily-target'

const PLAN: NutritionPlanTargets = {
  targetKcalHard: 2800,
  targetKcalEasy: 2400,
  targetKcalRest: 2000,
  proteinG: 150,
  carbsHardG: 350,
  carbsEasyG: 280,
  fatG: 80,
}

// ---------------------------------------------------------------------------
// Intensidades conocidas
// ---------------------------------------------------------------------------
describe('getDailyNutritionTarget — HIGH', () => {
  it('devuelve valores del día duro', () => {
    const r = getDailyNutritionTarget('HIGH', PLAN)
    expect(r.kcal).toBe(2800)
    expect(r.proteinG).toBe(150)
    expect(r.carbsG).toBe(350)
    expect(r.fatG).toBe(80)
    expect(r.label).toBe('Día duro')
    expect(r.intensity).toBe('HIGH')
  })
})

describe('getDailyNutritionTarget — MODERATE', () => {
  it('devuelve valores del día fácil', () => {
    const r = getDailyNutritionTarget('MODERATE', PLAN)
    expect(r.kcal).toBe(2400)
    expect(r.carbsG).toBe(280)
    expect(r.label).toBe('Día moderado')
    expect(r.intensity).toBe('MODERATE')
  })
})

describe('getDailyNutritionTarget — LOW', () => {
  it('kcal = 88% del día fácil', () => {
    const r = getDailyNutritionTarget('LOW', PLAN)
    expect(r.kcal).toBe(Math.round(2400 * 0.88)) // 2112
  })

  it('carbos = 75% de carbsEasyG', () => {
    const r = getDailyNutritionTarget('LOW', PLAN)
    expect(r.carbsG).toBe(Math.round(280 * 0.75)) // 210
  })

  it('label y intensity correctos', () => {
    const r = getDailyNutritionTarget('LOW', PLAN)
    expect(r.label).toBe('Día suave')
    expect(r.intensity).toBe('LOW')
  })

  it('proteína y grasa no cambian respecto a otros días', () => {
    const r = getDailyNutritionTarget('LOW', PLAN)
    expect(r.proteinG).toBe(150)
    expect(r.fatG).toBe(80)
  })
})

describe('getDailyNutritionTarget — REST', () => {
  it('devuelve valores del día descanso', () => {
    const r = getDailyNutritionTarget('REST', PLAN)
    expect(r.kcal).toBe(2000)
    expect(r.carbsG).toBe(Math.round(280 * 0.6)) // 168
    expect(r.label).toBe('Día descanso')
  })
})

// ---------------------------------------------------------------------------
// Fallbacks — null / undefined / valor desconocido
// ---------------------------------------------------------------------------
describe('getDailyNutritionTarget — fallbacks a descanso', () => {
  it('null → día descanso', () => {
    const r = getDailyNutritionTarget(null, PLAN)
    expect(r.kcal).toBe(2000)
    expect(r.label).toBe('Día descanso')
  })

  it('undefined → día descanso', () => {
    const r = getDailyNutritionTarget(undefined, PLAN)
    expect(r.kcal).toBe(2000)
  })

  it('valor desconocido → día descanso', () => {
    const r = getDailyNutritionTarget('UNKNOWN_VALUE', PLAN)
    expect(r.kcal).toBe(2000)
  })
})

// ---------------------------------------------------------------------------
// Invariantes
// ---------------------------------------------------------------------------
describe('getDailyNutritionTarget — invariantes', () => {
  it('proteína igual en todos los tipos de día', () => {
    const intensities = ['HIGH', 'MODERATE', 'LOW', 'REST', null, undefined]
    intensities.forEach(i => {
      expect(getDailyNutritionTarget(i, PLAN).proteinG).toBe(150)
    })
  })

  it('grasa igual en todos los tipos de día', () => {
    const intensities = ['HIGH', 'MODERATE', 'LOW', 'REST', null]
    intensities.forEach(i => {
      expect(getDailyNutritionTarget(i, PLAN).fatG).toBe(80)
    })
  })

  it('kcal: HIGH > MODERATE > LOW > REST', () => {
    const high = getDailyNutritionTarget('HIGH', PLAN).kcal
    const mod  = getDailyNutritionTarget('MODERATE', PLAN).kcal
    const low  = getDailyNutritionTarget('LOW', PLAN).kcal
    const rest = getDailyNutritionTarget('REST', PLAN).kcal
    expect(high).toBeGreaterThan(mod)
    expect(mod).toBeGreaterThan(low)
    expect(low).toBeGreaterThan(rest)
  })
})
