import { describe, it, expect } from 'vitest'
import {
  estimateHRMax,
  calculateHRZones,
  calculateTDEE,
  calculateMacros,
  predictRaceTime,
} from './formulas'

// ---------------------------------------------------------------------------
// estimateHRMax
// ---------------------------------------------------------------------------
describe('estimateHRMax', () => {
  it('aplica 211 - 0.64 × edad', () => {
    expect(estimateHRMax(30)).toBe(192) // 211 - 19.2 = 191.8 → 192
    expect(estimateHRMax(20)).toBe(198) // 211 - 12.8 = 198.2 → 198
    expect(estimateHRMax(50)).toBe(179) // 211 - 32 = 179
    expect(estimateHRMax(40)).toBe(185) // 211 - 25.6 = 185.4 → 185
  })

  it('decrece con la edad', () => {
    expect(estimateHRMax(20)).toBeGreaterThan(estimateHRMax(30))
    expect(estimateHRMax(30)).toBeGreaterThan(estimateHRMax(50))
  })
})

// ---------------------------------------------------------------------------
// calculateHRZones
// ---------------------------------------------------------------------------
describe('calculateHRZones', () => {
  it('usa Karvonen cuando hrResting > 0', () => {
    const zones = calculateHRZones(190, 60)
    // reserve = 130
    // z1: 60 + 130×0.60 = 138  →  60 + 130×0.70 = 151
    expect(zones.z1).toEqual({ min: 138, max: 151 })
    // z5.max siempre = hrMax
    expect(zones.z5.max).toBe(190)
  })

  it('usa porcentaje simple cuando hrResting === 0', () => {
    const zones = calculateHRZones(200, 0)
    expect(zones.z1).toEqual({ min: 120, max: 140 })
    expect(zones.z5).toEqual({ min: 180, max: 200 })
  })

  it('usa porcentaje simple por defecto (sin hrResting)', () => {
    const zones = calculateHRZones(200)
    expect(zones.z1.min).toBe(120)
    expect(zones.z5.max).toBe(200)
  })

  it('z5.max siempre iguala hrMax exacto', () => {
    expect(calculateHRZones(185, 55).z5.max).toBe(185)
    expect(calculateHRZones(175).z5.max).toBe(175)
  })

  it('zonas son contiguas (max z_n = min z_{n+1})', () => {
    const z = calculateHRZones(190, 60)
    expect(z.z1.max).toBe(z.z2.min)
    expect(z.z2.max).toBe(z.z3.min)
    expect(z.z3.max).toBe(z.z4.min)
    expect(z.z4.max).toBe(z.z5.min)
  })

  it('zonas son contiguas con porcentaje simple', () => {
    const z = calculateHRZones(200)
    expect(z.z1.max).toBe(z.z2.min)
    expect(z.z4.max).toBe(z.z5.min)
  })
})

// ---------------------------------------------------------------------------
// calculateTDEE
// ---------------------------------------------------------------------------
describe('calculateTDEE', () => {
  it('hombre 70kg / 175cm / 30a / 4 días → 2556 kcal', () => {
    // BMR = 10×70 + 6.25×175 - 5×30 + 5 = 1648.75 · factor 1.55 = 2555.56 → 2556
    expect(calculateTDEE(70, 175, 30, 'male', 4)).toBe(2556)
  })

  it('mujer 60kg / 165cm / 25a / 3 días → 1850 kcal', () => {
    // BMR = 10×60 + 6.25×165 - 5×25 - 161 = 1345.25 · factor 1.375 = 1849.72 → 1850
    expect(calculateTDEE(60, 165, 25, 'female', 3)).toBe(1850)
  })

  it('más días de entrenamiento → mayor TDEE', () => {
    const base = calculateTDEE(70, 175, 30, 'male', 4)
    expect(calculateTDEE(70, 175, 30, 'male', 3)).toBeLessThan(base)
    expect(calculateTDEE(70, 175, 30, 'male', 5)).toBeGreaterThan(base)
    expect(calculateTDEE(70, 175, 30, 'male', 6)).toBeGreaterThan(
      calculateTDEE(70, 175, 30, 'male', 5)
    )
  })

  it('mujer siempre < hombre con mismos parámetros', () => {
    const male = calculateTDEE(70, 175, 30, 'male', 4)
    const female = calculateTDEE(70, 175, 30, 'female', 4)
    expect(female).toBeLessThan(male)
  })
})

// ---------------------------------------------------------------------------
// calculateMacros
// ---------------------------------------------------------------------------
describe('calculateMacros', () => {
  it('proteína siempre es 2g/kg en todos los días', () => {
    const m = calculateMacros(2500, 75, false)
    expect(m.hard.protein).toBe(150)
    expect(m.easy.protein).toBe(150)
    expect(m.rest.protein).toBe(150)
  })

  it('kcal: hard > easy > rest', () => {
    const m = calculateMacros(2500, 70, false)
    expect(m.hard.kcal).toBeGreaterThan(m.easy.kcal)
    expect(m.easy.kcal).toBeGreaterThan(m.rest.kcal)
  })

  it('carbos: hard > easy > rest', () => {
    const m = calculateMacros(2500, 70, false)
    expect(m.hard.carbs).toBeGreaterThan(m.easy.carbs)
    expect(m.easy.carbs).toBeGreaterThan(m.rest.carbs)
  })

  it('aplica déficit de 500 kcal cuando hasWeightGoal = true', () => {
    const sin = calculateMacros(2500, 70, false)
    const con = calculateMacros(2500, 70, true)
    expect(con.hard.kcal).toBe(sin.hard.kcal - 500)
    expect(con.easy.kcal).toBe(sin.easy.kcal - 500)
    expect(con.rest.kcal).toBe(sin.rest.kcal - 500)
  })

  it('mínimo seguro de 1200 kcal aunque tdee sea muy bajo', () => {
    const m = calculateMacros(800, 40, true)
    expect(m.hard.kcal).toBeGreaterThanOrEqual(1200)
    expect(m.easy.kcal).toBeGreaterThanOrEqual(1200)
    expect(m.rest.kcal).toBeGreaterThanOrEqual(1200)
  })

  it('grasa nunca es negativa', () => {
    const m = calculateMacros(1500, 80, true)
    expect(m.hard.fat).toBeGreaterThan(0)
    expect(m.easy.fat).toBeGreaterThan(0)
    expect(m.rest.fat).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// predictRaceTime
// ---------------------------------------------------------------------------
describe('predictRaceTime', () => {
  it('devuelve null sin tiempos de referencia', () => {
    expect(predictRaceTime(null, null, 70, 21.1)).toBeNull()
  })

  it('predice tiempo de maratón desde 10K', () => {
    // 10K en 50min (3000s) → maratón > 3h = 10800s
    const result = predictRaceTime(null, 3000, 70, 42.195)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(10000)
  })

  it('predice tiempo usando solo 5K', () => {
    const result = predictRaceTime(1200, null, 65, 10)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(1200) // 10K siempre > 5K en tiempo
  })

  it('para distancias ≥10K prefiere 10K sobre 5K como referencia', () => {
    const con10k = predictRaceTime(1200, 2600, 70, 21.1)
    const solo5k = predictRaceTime(1200, null, 70, 21.1)
    expect(con10k).not.toEqual(solo5k)
  })

  it('atletas >80kg son ligeramente más lentos que <80kg', () => {
    const ligero = predictRaceTime(null, 2400, 75, 21.1)
    const pesado = predictRaceTime(null, 2400, 85, 21.1)
    expect(pesado!).toBeGreaterThan(ligero!)
  })

  it('la predicción escala con la distancia (más lejos = más tiempo)', () => {
    const t5k = predictRaceTime(1200, null, 70, 5)
    const t10k = predictRaceTime(1200, null, 70, 10)
    const t21k = predictRaceTime(1200, null, 70, 21.1)
    expect(t10k!).toBeGreaterThan(t5k!)
    expect(t21k!).toBeGreaterThan(t10k!)
  })
})
