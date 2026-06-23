/**
 * Shared meal plan generation logic — used by web and mobile generate-meals routes.
 *
 * Separates:
 *  - buildMealPlanPrompt()  — pure function, no side effects
 *  - callAIForMealPlan()    — AI call + JSON extraction
 */

import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'

export type GenerateMealsInput = {
  availableFoods: string[]
  availableFoodIds?: string[]
  restrictions: string[]
  mealsPerDay: number
  weighsFood: boolean
  notes?: string
}

type ProfileInput = {
  weightKg: number | null
  heightCm: number | null
  age: number | null
  gender: string | null
  weightGoalKg: number | null
  sport: string | null
}

export type MacroTargets = ReturnType<typeof calculateMacros>

export function computeNutritionTargets(profile: ProfileInput) {
  const tdee = calculateTDEE(
    profile.weightKg ?? 70,
    profile.heightCm ?? 170,
    profile.age ?? 30,
    (profile.gender ?? 'male') as 'male' | 'female',
    5
  )
  const macros = calculateMacros(tdee, profile.weightKg ?? 70, !!profile.weightGoalKg)
  return { tdee, macros }
}

/**
 * Fallback determinista — se usa cuando callAIForMealPlan falla.
 * Distribuye los macros calculados entre las comidas disponibles
 * usando los alimentos que el usuario registró. Sin AI, sin latencia.
 */
export function buildStaticMealPlan(macros: MacroTargets, input: GenerateMealsInput): unknown {
  const foods = input.availableFoods
  const n = Math.max(2, Math.min(6, input.mealsPerDay))

  const TIME_SLOTS = ['07:00', '10:30', '13:00', '16:30', '19:30', '21:00']
  const LABELS     = ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena', 'Post-cena']

  function buildMeals(kcal: number, protein: number, carbs: number, fat: number) {
    return Array.from({ length: n }, (_, i) => ({
      time:    TIME_SLOTS[i] ?? `${7 + i * 3}:00`,
      label:   LABELS[i]    ?? `Comida ${i + 1}`,
      foods:   foods[i % foods.length] ?? 'Según disponibilidad',
      kcal:    Math.round(kcal    / n),
      protein: Math.round(protein / n),
      carbs:   Math.round(carbs   / n),
      fat:     Math.round(fat     / n),
    }))
  }

  const baseRules = [
    'Plan base generado sin IA — ajusta cantidades según tu apetito real.',
    'Distribuye la proteína uniformemente entre todas las comidas.',
    'Consume más carbohidratos antes y después del entrenamiento.',
    'Hidratación mínima: 35 ml por kg de peso corporal.',
  ]

  const hydration = { hard: 2.5, easy: 2.0, rest: 1.8 }
  const restCarbs = Math.round(macros.easy.carbs * 0.7)

  return {
    hard: {
      meals: buildMeals(macros.hard.kcal, macros.hard.protein, macros.hard.carbs, macros.hard.fat),
      supplements: [{ name: 'Agua', dose: '2.5L', when: 'Durante el día', purpose: 'Hidratación base' }],
      hydrationL: hydration.hard,
      rules: baseRules,
    },
    easy: {
      meals: buildMeals(macros.easy.kcal, macros.easy.protein, macros.easy.carbs, macros.easy.fat),
      supplements: [{ name: 'Agua', dose: '2L', when: 'Durante el día', purpose: 'Hidratación base' }],
      hydrationL: hydration.easy,
      rules: baseRules,
    },
    rest: {
      meals: buildMeals(macros.rest.kcal, macros.rest.protein, restCarbs, macros.rest.fat),
      supplements: [{ name: 'Agua', dose: '1.8L', when: 'Durante el día', purpose: 'Hidratación base' }],
      hydrationL: hydration.rest,
      rules: baseRules,
    },
  }
}
