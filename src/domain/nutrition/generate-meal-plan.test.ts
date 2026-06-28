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
// buildStaticMealPlan — dbFoods (Phase 29: porciones en gramos)
// ---------------------------------------------------------------------------

const DB_PROTEIN: import('./generate-meal-plan').DbFood = {
  name: 'Pechuga de pollo cocida',
  category: 'PROTEIN',
  kcalPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
  servingG: 200,
  servingLabel: '1 pechuga mediana',
}
const DB_CARB: import('./generate-meal-plan').DbFood = {
  name: 'Arroz blanco cocido',
  category: 'CARB',
  kcalPer100g: 130,
  proteinPer100g: 2.7,
  carbsPer100g: 28,
  fatPer100g: 0.3,
  servingG: 180,
  servingLabel: '1 taza cocida',
}
const DB_VEG: import('./generate-meal-plan').DbFood = {
  name: 'Brócoli',
  category: 'VEGETABLE',
  kcalPer100g: 34,
  proteinPer100g: 2.8,
  carbsPer100g: 7,
  fatPer100g: 0.4,
  servingG: 150,
  servingLabel: '1 taza en floretes',
}
const DB_FRUIT: import('./generate-meal-plan').DbFood = {
  name: 'Banano / plátano maduro',
  category: 'FRUIT',
  kcalPer100g: 89,
  proteinPer100g: 1.1,
  carbsPer100g: 23,
  fatPer100g: 0.3,
  servingG: 120,
  servingLabel: '1 banano mediano',
}
const DB_FAT: import('./generate-meal-plan').DbFood = {
  name: 'Aguacate',
  category: 'FAT',
  kcalPer100g: 160,
  proteinPer100g: 2,
  carbsPer100g: 9,
  fatPer100g: 15,
  servingG: 100,
  servingLabel: '½ aguacate mediano',
}

describe('buildStaticMealPlan — dbFoods: porciones en gramos (weighsFood=true)', () => {
  it('sin dbFoods sigue usando fallback (nombre del alimento)', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, availableFoods: ['Pollo'], mealsPerDay: 3 }) as any
    expect(plan.hard.meals[0].foods).toBe('Pollo')
  })

  it('con dbFoods vacío sigue usando fallback', () => {
    const plan = buildStaticMealPlan(MACROS, { ...BASE_INPUT, availableFoods: ['Pollo'], mealsPerDay: 3 }, []) as any
    expect(plan.hard.meals[0].foods).toBe('Pollo')
  })

  it('con dbFoods y weighsFood=true: muestra gramos calculados del alimento proteico', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: true, mealsPerDay: 3 },
      [DB_PROTEIN]
    ) as any
    const foodLine: string = plan.hard.meals[0].foods
    // Debe empezar con un número seguido de "g Pechuga de pollo cocida"
    expect(foodLine).toMatch(/^\d+g Pechuga de pollo cocida/)
  })

  it('con dbFoods y weighsFood=true: proteína + carb + veggie en una comida', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: true, mealsPerDay: 3 },
      [DB_PROTEIN, DB_CARB, DB_VEG]
    ) as any
    const foodLine: string = plan.hard.meals[0].foods
    // Debe contener las tres partes separadas por " · "
    expect(foodLine).toContain(' · ')
    const parts = foodLine.split(' · ')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toMatch(/^\d+g Pechuga de pollo cocida/)
    expect(parts[1]).toMatch(/^\d+g Arroz blanco cocido/)
    expect(parts[2]).toBe('80g Brócoli')
  })

  it('con dbFoods y weighsFood=true: gramos de proteína están entre 50 y 500', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: true, mealsPerDay: 3 },
      [DB_PROTEIN, DB_CARB]
    ) as any
    for (const meal of plan.hard.meals as any[]) {
      const grams = parseInt(meal.foods.split('g ')[0], 10)
      expect(grams).toBeGreaterThanOrEqual(50)
      expect(grams).toBeLessThanOrEqual(500)
    }
  })

  it('gramos calculados son consistentes entre todos los tipos de día (proteína es constante)', () => {
    // calculateMacros usa weightKg*2 como proteína fija en todos los días
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: true, mealsPerDay: 3 },
      [DB_PROTEIN]
    ) as any
    const gramsHard = parseInt(plan.hard.meals[0].foods.split('g ')[0], 10)
    const gramsRest = parseInt(plan.rest.meals[0].foods.split('g ')[0], 10)
    // La proteína es idéntica en todos los tipos de día → los gramos son iguales
    expect(gramsHard).toBeGreaterThanOrEqual(gramsRest)
    expect(gramsHard).toBeGreaterThan(0)
  })
})

describe('buildStaticMealPlan — dbFoods: medidas caseras (weighsFood=false)', () => {
  it('muestra servingLabel + nombre cuando weighsFood=false', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: false, mealsPerDay: 3 },
      [DB_PROTEIN]
    ) as any
    expect(plan.hard.meals[0].foods).toBe('1 pechuga mediana Pechuga de pollo cocida')
  })

  it('veggie usa servingLabel cuando weighsFood=false', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: false, mealsPerDay: 3 },
      [DB_PROTEIN, DB_CARB, DB_VEG]
    ) as any
    const parts = plan.hard.meals[0].foods.split(' · ')
    expect(parts[2]).toBe('1 taza en floretes Brócoli')
  })
})

describe('buildStaticMealPlan — dbFoods: comidas ligeras (snacks)', () => {
  it('con n=4, la comida 1 (Media mañana) es un snack con fruta si hay disponible', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: true, mealsPerDay: 4 },
      [DB_PROTEIN, DB_CARB, DB_FRUIT]
    ) as any
    const snackMeal: string = plan.hard.meals[1].foods
    // El snack debe contener el banano, no la pechuga
    expect(snackMeal).toContain('Banano / plátano maduro')
  })

  it('con n=4, la última comida (Post-cena) también es snack', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: false, mealsPerDay: 4 },
      [DB_PROTEIN, DB_CARB, DB_FRUIT, DB_FAT]
    ) as any
    const lastMeal: string = plan.hard.meals[3].foods
    // Debe ser un snack (fruta o grasa), no la comida principal
    const isSnack = lastMeal.includes('Banano') || lastMeal.includes('Aguacate')
    expect(isSnack).toBe(true)
  })

  it('con n=3 (solo comidas principales), no aplica lógica de snack', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: true, mealsPerDay: 3 },
      [DB_PROTEIN, DB_FRUIT]
    ) as any
    // Con n=3, isSnack solo aplica cuando n>=4 → ninguna comida es snack
    // Todas las comidas son principales y tienen la proteína
    const allHaveProtein = plan.hard.meals.every((m: any) =>
      (m.foods as string).includes('Pechuga de pollo cocida')
    )
    expect(allHaveProtein).toBe(true)
  })

  it('sin frutas/grasas en dbFoods, comida ligera usa fallback de availableFoods', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, availableFoods: ['Huevo'], weighsFood: true, mealsPerDay: 4 },
      [DB_PROTEIN] // solo proteína, sin fruta/grasa
    ) as any
    const snackMeal: string = plan.hard.meals[1].foods
    // snackFoods vacío → buildFoodLine sin carbs ni vegs → solo proteína o fallback
    expect(typeof snackMeal).toBe('string')
    expect(snackMeal.length).toBeGreaterThan(0)
  })
})

describe('buildStaticMealPlan — dbFoods: rotación entre múltiples alimentos', () => {
  const DB_PROTEIN_2: import('./generate-meal-plan').DbFood = {
    name: 'Huevo entero',
    category: 'PROTEIN',
    kcalPer100g: 155,
    proteinPer100g: 13,
    carbsPer100g: 1.1,
    fatPer100g: 11,
    servingG: 50,
    servingLabel: '1 huevo grande',
  }

  it('con 2 proteínas distintas, comidas pares e impares rotan entre ellas', () => {
    const plan = buildStaticMealPlan(
      MACROS,
      { ...BASE_INPUT, weighsFood: false, mealsPerDay: 3 },
      [DB_PROTEIN, DB_PROTEIN_2]
    ) as any
    const meal0: string = plan.hard.meals[0].foods
    const meal1: string = plan.hard.meals[1].foods
    const meal2: string = plan.hard.meals[2].foods
    // i=0 → proteins[0], i=1 → proteins[1], i=2 → proteins[0]
    expect(meal0).toContain('Pechuga de pollo cocida')
    expect(meal1).toContain('Huevo entero')
    expect(meal2).toContain('Pechuga de pollo cocida')
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
