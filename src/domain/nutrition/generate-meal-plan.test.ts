import { describe, it, expect } from 'vitest'
import { buildStaticMealPlan, computeNutritionTargets, type MacroTargets } from './generate-meal-plan'
import { calculateMacros } from '@/lib/plan/formulas'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MACROS: MacroTargets = calculateMacros(2500, 75, false)
// hard = TDEE+250 = 2750 at 50% carbs, easy = 2300 at 35%, rest = 1900 at 25%
// protein = 150g (75*2) across all days

const BASE_INPUT = {
  availableFoods: ['Pollo', 'Arroz', 'Brócoli', 'Huevo', 'Avena'],
  availableFoodIds: [],
  restrictions: [],
  mealsPerDay: 3,
  weighsFood: false,
}

// ---------------------------------------------------------------------------
// buildStaticMealPlan — estructura
// ---------------------------------------------------------------------------
describe('buildStaticMealPlan — estructura', () => {
  it('retorna las tres claves del día: hard, easy, rest', () => {
    const plan = buildStaticMealPlan(MACROS, BASE_INPUT) as any
    expect(plan).toHaveProperty('hard')
    expect(plan).toHaveProperty('easy')
    expect(plan).toHaveProperty('rest')
  })

  it('cada tipo de día tiene meals, supplements, hydrationL, rules', () => {
    const plan = buildStaticMealPlan(MACROS, BASE_INPUT) as any
    for (const day of ['hard', 'easy', 'rest']) {
      expect(plan[day]).toHaveProperty('meals')
      expect(plan[day]).toHaveProperty('supplements')
      expect(plan[day]).toHaveProperty('hydrationL')
      expect(plan[day]).toHaveProperty('rules')
    }
  })

  it('cada comida tiene los campos correctos', () => {
    const plan = buildStaticMealPlan(MACROS, BASE_INPUT) as any
    for (const meal of plan.hard.meals) {
      expect(meal).toHaveProperty('time')
      expect(meal).toHaveProperty('label')
      expect(meal).toHaveProperty('foods')
      expect(meal).toHaveProperty('kcal')
      expect(meal).toHaveProperty('protein')
      expect(meal).toHaveProperty('carbs')
      expect(meal).toHaveProperty('fat')
    }
  })

  it('meals.length === mealsPerDay', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: 4 }) as any
    expect(plan.hard.meals).toHaveLength(4)
    expect(plan.easy.meals).toHaveLength(4)
    expect(plan.rest.meals).toHaveLength(4)
  })

  it('rules tiene exactamente 4 items', () => {
    const plan = buildStaticMealPlan(MACROS, BASE_INPUT) as any
    expect(plan.hard.rules).toHaveLength(4)
    expect(plan.easy.rules).toHaveLength(4)
    expect(plan.rest.rules).toHaveLength(4)
  })

  it('supplements contiene al menos un item (Agua)', () => {
    const plan = buildStaticMealPlan(MACROS, BASE_INPUT) as any
    expect(plan.hard.supplements.length).toBeGreaterThan(0)
    expect(plan.hard.supplements[0].name).toBe('Agua')
  })
})

// ---------------------------------------------------------------------------
// buildStaticMealPlan — clamp mealsPerDay
// ---------------------------------------------------------------------------
describe('buildStaticMealPlan — mealsPerDay clamped a [2, 6]', () => {
  it('mealsPerDay = 1 → 2 comidas', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: 1 }) as any
    expect(plan.hard.meals).toHaveLength(2)
  })

  it('mealsPerDay = 0 → 2 comidas', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: 0 }) as any
    expect(plan.hard.meals).toHaveLength(2)
  })

  it('mealsPerDay = 7 → 6 comidas (máximo)', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: 7 }) as any
    expect(plan.hard.meals).toHaveLength(6)
  })

  it('mealsPerDay = 6 → 6 comidas (no excede máximo)', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: 6 }) as any
    expect(plan.hard.meals).toHaveLength(6)
  })
})

// ---------------------------------------------------------------------------
// buildStaticMealPlan — distribución de macros
// ---------------------------------------------------------------------------
describe('buildStaticMealPlan — distribución de macros por comida', () => {
  it('cada comida del día duro tiene kcal = Math.round(hard.kcal / n)', () => {
    const n = 3
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: n }) as any
    const expected = Math.round(MACROS.hard.kcal / n)
    plan.hard.meals.forEach((m: any) => expect(m.kcal).toBe(expected))
  })

  it('proteína igual en cada comida de cada tipo de día', () => {
    const n = 3
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: n }) as any
    const expectedProtein = Math.round(MACROS.hard.protein / n)
    plan.hard.meals.forEach((m: any) => expect(m.protein).toBe(expectedProtein))
    plan.easy.meals.forEach((m: any) => expect(m.protein).toBe(Math.round(MACROS.easy.protein / n)))
    plan.rest.meals.forEach((m: any) => expect(m.protein).toBe(Math.round(MACROS.rest.protein / n)))
  })

  it('día rest usa 70% de carbsEasy para los carbos', () => {
    const n = 3
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: n }) as any
    const restCarbs = Math.round(MACROS.easy.carbs * 0.7)
    const expectedCarbsPerMeal = Math.round(restCarbs / n)
    plan.rest.meals.forEach((m: any) => expect(m.carbs).toBe(expectedCarbsPerMeal))
  })

  it('kcal por comida: hard > easy > rest', () => {
    const n = 3
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: n }) as any
    expect(plan.hard.meals[0].kcal).toBeGreaterThan(plan.easy.meals[0].kcal)
    expect(plan.easy.meals[0].kcal).toBeGreaterThan(plan.rest.meals[0].kcal)
  })
})

// ---------------------------------------------------------------------------
// buildStaticMealPlan — hidratación
// ---------------------------------------------------------------------------
describe('buildStaticMealPlan — hydrationL', () => {
  it('hard = 2.5 L, easy = 2.0 L, rest = 1.8 L', () => {
    const plan = buildStaticMealPlan(MACROS, BASE_INPUT) as any
    expect(plan.hard.hydrationL).toBe(2.5)
    expect(plan.easy.hydrationL).toBe(2.0)
    expect(plan.rest.hydrationL).toBe(1.8)
  })
})

// ---------------------------------------------------------------------------
// buildStaticMealPlan — times y labels
// ---------------------------------------------------------------------------
describe('buildStaticMealPlan — time slots y labels', () => {
  it('primera comida siempre a las 07:00 y label Desayuno', () => {
    const plan = buildStaticMealPlan(MACROS, BASE_INPUT) as any
    expect(plan.hard.meals[0].time).toBe('07:00')
    expect(plan.hard.meals[0].label).toBe('Desayuno')
  })

  it('segunda comida a las 10:30 y label Media mañana', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, mealsPerDay: 4 }) as any
    expect(plan.hard.meals[1].time).toBe('10:30')
    expect(plan.hard.meals[1].label).toBe('Media mañana')
  })
})

// ---------------------------------------------------------------------------
// buildStaticMealPlan — rotación de alimentos
// ---------------------------------------------------------------------------
describe('buildStaticMealPlan — rotación de alimentos', () => {
  it('asigna alimentos en round-robin por índice de comida', () => {
    const foods = ['Pollo', 'Arroz', 'Brócoli']
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, availableFoods: foods, mealsPerDay: 4 }) as any
    expect(plan.hard.meals[0].foods).toBe('Pollo')
    expect(plan.hard.meals[1].foods).toBe('Arroz')
    expect(plan.hard.meals[2].foods).toBe('Brócoli')
    expect(plan.hard.meals[3].foods).toBe('Pollo') // vuelve al inicio
  })

  it('un solo alimento → todas las comidas lo repiten', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, availableFoods: ['Pollo'], mealsPerDay: 3 }) as any
    plan.hard.meals.forEach((m: any) => expect(m.foods).toBe('Pollo'))
  })

  it('todos los tipos de día comparten la misma rotación de alimentos', () => {
    const plan = buildStaticMealPlan(MACROS, BASE_INPUT) as any
    expect(plan.hard.meals[0].foods).toBe(plan.easy.meals[0].foods)
    expect(plan.hard.meals[0].foods).toBe(plan.rest.meals[0].foods)
  })
})

// ---------------------------------------------------------------------------
// computeNutritionTargets — defaults y valores reales
// ---------------------------------------------------------------------------
describe('computeNutritionTargets', () => {
  it('devuelve tdee > 0 y macros válidos con perfil completo', () => {
    const result = computeNutritionTargets({
      weightKg: 75, heightCm: 178, age: 30, gender: 'male', weightGoalKg: null, sport: 'RUNNING',
    })
    expect(result.tdee).toBeGreaterThan(1500)
    expect(result.macros.hard.kcal).toBeGreaterThan(0)
    expect(result.macros.hard.protein).toBe(150) // 75 * 2
  })

  it('usa defaults cuando los campos del perfil son null', () => {
    const result = computeNutritionTargets({
      weightKg: null, heightCm: null, age: null, gender: null, weightGoalKg: null, sport: null,
    })
    // Con defaults (70kg, 170cm, 30y, male, 5 días): tdee ~ 2315
    expect(result.tdee).toBeGreaterThan(1800)
    expect(result.macros.hard.protein).toBe(140) // 70 * 2
  })

  it('activar weightGoalKg (déficit) reduce kcal respecto a sin déficit', () => {
    const sinDeficit = computeNutritionTargets({
      weightKg: 75, heightCm: 175, age: 28, gender: 'female', weightGoalKg: null, sport: null,
    })
    const conDeficit = computeNutritionTargets({
      weightKg: 75, heightCm: 175, age: 28, gender: 'female', weightGoalKg: 65, sport: null,
    })
    expect(conDeficit.macros.hard.kcal).toBeLessThan(sinDeficit.macros.hard.kcal)
  })

  it('hombre genera mayor tdee que mujer con mismo perfil', () => {
    const base = { weightKg: 70, heightCm: 170, age: 30, weightGoalKg: null, sport: null }
    const male   = computeNutritionTargets({ ...base, gender: 'male' })
    const female = computeNutritionTargets({ ...base, gender: 'female' })
    expect(male.tdee).toBeGreaterThan(female.tdee)
  })
})
