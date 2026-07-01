/**
 * E2E agent: athlete-formulas — getAccountStatus + getDailyNutritionTargets
 *
 * getDailyNutritionTargets tiene una API DIFERENTE a getDailyNutritionTarget en daily-target.ts:
 *   - Esta función: recibe tdee + weightKg + DayLoad (HIGH|MODERATE|LOW|REST|NONE)
 *   - daily-target.ts: recibe intensity + planData (un NutritionPlan de DB)
 *
 * Esta función se usa en vistas de atleta gym (B2C sin plan estructurado) y en
 * recálculo de macros post check-in (syncWeight). Si los valores son incorrectos,
 * el atleta ve metas nutricionales incoherentes con su entrenamiento.
 *
 * getAccountStatus determina si un usuario ve features PRO en la UI.
 * Si mapea mal TRIAL → PRO, usuarios gratuitos verían features de pago.
 *
 * Cómo correr:
 *   pnpm test src/lib/core/athlete-formulas.test.ts
 */
import { describe, it, expect } from 'vitest'
import { getDailyNutritionTargets, getAccountStatus } from './athlete-formulas'

// ── getAccountStatus ──────────────────────────────────────────────────────────

describe('getAccountStatus', () => {
  it('PRO → PRO', () => {
    expect(getAccountStatus('PRO')).toBe('PRO')
  })

  it('FREE → FREE', () => {
    expect(getAccountStatus('FREE')).toBe('FREE')
  })

  it('TRIAL → FREE (sin acceso PRO activo)', () => {
    // TRIAL mapea a FREE en la UI — el tier premium en DB no implica acceso PRO
    // hasta que se integre la verificación de pago (Stripe/Wompi pendiente)
    expect(getAccountStatus('TRIAL')).toBe('FREE')
  })

  it('solo PRO retorna PRO — cualquier otro valor es FREE', () => {
    expect(getAccountStatus('PRO')).toBe('PRO')
    expect(getAccountStatus('FREE')).toBe('FREE')
    expect(getAccountStatus('TRIAL')).toBe('FREE')
  })
})

// ── getDailyNutritionTargets — estructura del resultado ────────────────────────

describe('getDailyNutritionTargets — estructura', () => {
  const TDEE = 2400
  const WEIGHT = 75

  it('retorna { kcal, protein, carbs, fat } para HIGH', () => {
    const result = getDailyNutritionTargets(TDEE, WEIGHT, 'HIGH')
    expect(result).toHaveProperty('kcal')
    expect(result).toHaveProperty('protein')
    expect(result).toHaveProperty('carbs')
    expect(result).toHaveProperty('fat')
  })

  it('todos los campos son números positivos para todos los DayLoad', () => {
    const loads = ['HIGH', 'MODERATE', 'LOW', 'REST', 'NONE'] as const
    loads.forEach((load) => {
      const r = getDailyNutritionTargets(TDEE, WEIGHT, load)
      expect(r.kcal, `kcal para ${load}`).toBeGreaterThan(0)
      expect(r.protein, `protein para ${load}`).toBeGreaterThan(0)
      expect(r.carbs, `carbs para ${load}`).toBeGreaterThan(0)
      expect(r.fat, `fat para ${load}`).toBeGreaterThan(0)
    })
  })
})

// ── getDailyNutritionTargets — calorías por carga ─────────────────────────────

describe('getDailyNutritionTargets — calorías por carga', () => {
  const TDEE = 2400
  const WEIGHT = 75

  it('HIGH → kcal = TDEE (sin reducción — día de entrenamiento intenso)', () => {
    expect(getDailyNutritionTargets(TDEE, WEIGHT, 'HIGH').kcal).toBe(TDEE)
  })

  it('MODERATE → kcal = TDEE - 200', () => {
    expect(getDailyNutritionTargets(TDEE, WEIGHT, 'MODERATE').kcal).toBe(TDEE - 200)
  })

  it('LOW → kcal = TDEE - 350', () => {
    expect(getDailyNutritionTargets(TDEE, WEIGHT, 'LOW').kcal).toBe(TDEE - 350)
  })

  it('REST → kcal = TDEE - 500 (máxima reducción)', () => {
    expect(getDailyNutritionTargets(TDEE, WEIGHT, 'REST').kcal).toBe(TDEE - 500)
  })

  it('NONE → kcal = TDEE - 500 (igual que REST — sin actividad)', () => {
    const rest = getDailyNutritionTargets(TDEE, WEIGHT, 'REST')
    const none = getDailyNutritionTargets(TDEE, WEIGHT, 'NONE')
    expect(none.kcal).toBe(rest.kcal)
  })

  it('calorías son monótonamente decrecientes: HIGH > MODERATE > LOW > REST', () => {
    const hi  = getDailyNutritionTargets(TDEE, WEIGHT, 'HIGH').kcal
    const mod = getDailyNutritionTargets(TDEE, WEIGHT, 'MODERATE').kcal
    const lo  = getDailyNutritionTargets(TDEE, WEIGHT, 'LOW').kcal
    const re  = getDailyNutritionTargets(TDEE, WEIGHT, 'REST').kcal
    expect(hi).toBeGreaterThan(mod)
    expect(mod).toBeGreaterThan(lo)
    expect(lo).toBeGreaterThan(re)
  })

  it('mínimo calórico clampea en 1200 kcal (protección contra TDEE muy bajo)', () => {
    // TDEE=1500, REST=1500-500=1000 < 1200 → debe clampear
    const r = getDailyNutritionTargets(1500, 50, 'REST')
    expect(r.kcal).toBeGreaterThanOrEqual(1200)
  })
})

// ── getDailyNutritionTargets — proteína 2g/kg ────────────────────────────────

describe('getDailyNutritionTargets — proteína', () => {
  it('protein = Math.round(weightKg × 2)', () => {
    expect(getDailyNutritionTargets(2400, 70, 'HIGH').protein).toBe(140)
    expect(getDailyNutritionTargets(2400, 65, 'HIGH').protein).toBe(130)
    expect(getDailyNutritionTargets(2400, 82.5, 'HIGH').protein).toBe(165)
  })

  it('proteína es constante sin importar la carga del día', () => {
    const weight = 68
    const loads = ['HIGH', 'MODERATE', 'LOW', 'REST', 'NONE'] as const
    const proteins = new Set(loads.map(l => getDailyNutritionTargets(2400, weight, l).protein))
    expect(proteins.size).toBe(1) // todos iguales
    expect([...proteins][0]).toBe(Math.round(weight * 2))
  })

  it('proteína no cambia entre días de entrenamiento y descanso', () => {
    const hard = getDailyNutritionTargets(2400, 75, 'HIGH').protein
    const rest = getDailyNutritionTargets(2400, 75, 'REST').protein
    expect(hard).toBe(rest)
  })
})

// ── getDailyNutritionTargets — carbohidratos periodizados ─────────────────────

describe('getDailyNutritionTargets — carbohidratos', () => {
  const TDEE = 2400
  const WEIGHT = 70

  it('HIGH tiene más carbohidratos que REST (periodización de carbs)', () => {
    const high = getDailyNutritionTargets(TDEE, WEIGHT, 'HIGH').carbs
    const rest = getDailyNutritionTargets(TDEE, WEIGHT, 'REST').carbs
    expect(high).toBeGreaterThan(rest)
  })

  it('HIGH carbPct = 50% del total de calorías', () => {
    const r = getDailyNutritionTargets(TDEE, WEIGHT, 'HIGH')
    // carbsG * 4 ≈ kcal * 0.50
    const carbKcal = r.carbs * 4
    expect(carbKcal).toBeCloseTo(TDEE * 0.50, -1) // tolerancia 10 kcal
  })

  it('REST carbPct = 25% del total de calorías', () => {
    const r = getDailyNutritionTargets(TDEE, WEIGHT, 'REST')
    const carbKcal = r.carbs * 4
    const expectedKcal = TDEE - 500
    expect(carbKcal).toBeCloseTo(expectedKcal * 0.25, -1)
  })

  it('carbs siempre son positivos', () => {
    const loads = ['HIGH', 'MODERATE', 'LOW', 'REST', 'NONE'] as const
    loads.forEach(l => {
      expect(getDailyNutritionTargets(TDEE, WEIGHT, l).carbs).toBeGreaterThan(0)
    })
  })
})

// ── getDailyNutritionTargets — grasas ─────────────────────────────────────────

describe('getDailyNutritionTargets — grasas', () => {
  it('fat nunca es negativo', () => {
    const loads = ['HIGH', 'MODERATE', 'LOW', 'REST', 'NONE'] as const
    loads.forEach(l => {
      expect(getDailyNutritionTargets(2400, 70, l).fat).toBeGreaterThanOrEqual(0)
    })
  })

  it('fat >= weightKg × 0.5 (grasa mínima esencial)', () => {
    const weightKg = 70
    const loads = ['HIGH', 'MODERATE', 'LOW', 'REST', 'NONE'] as const
    loads.forEach(l => {
      const r = getDailyNutritionTargets(2400, weightKg, l)
      expect(r.fat, `fat en ${l}`).toBeGreaterThanOrEqual(Math.round(weightKg * 0.5))
    })
  })
})

// ── getDailyNutritionTargets — invariantes generales ──────────────────────────

describe('getDailyNutritionTargets — invariantes', () => {
  it('es determinista: mismos inputs → mismos outputs', () => {
    const a = getDailyNutritionTargets(2400, 70, 'HIGH')
    const b = getDailyNutritionTargets(2400, 70, 'HIGH')
    expect(a).toEqual(b)
  })

  it('TDEE mayor → más calorías en todos los loads', () => {
    const low  = getDailyNutritionTargets(2000, 70, 'HIGH').kcal
    const high = getDailyNutritionTargets(3000, 70, 'HIGH').kcal
    expect(high).toBeGreaterThan(low)
  })

  it('atleta más pesado → mismas calorías pero más proteína', () => {
    const light = getDailyNutritionTargets(2400, 60, 'HIGH')
    const heavy = getDailyNutritionTargets(2400, 90, 'HIGH')
    expect(heavy.protein).toBeGreaterThan(light.protein)
    expect(heavy.kcal).toBe(light.kcal) // kcal depende de TDEE, no de weightKg
  })
})
