/**
 * Shared meal plan generation logic — used by web and mobile generate-meals routes.
 *
 * Separates:
 *  - buildMealPlanPrompt()  — pure function, no side effects
 *  - callAIForMealPlan()    — AI call + JSON extraction
 */

import Anthropic from '@anthropic-ai/sdk'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type GenerateMealsInput = {
  availableFoods: string[]
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

export function buildMealPlanPrompt(
  profile: ProfileInput,
  macros: MacroTargets,
  tdee: number,
  goalType: string | undefined,
  input: GenerateMealsInput
): string {
  const sportLabel = profile.sport ?? goalType ?? 'GENERAL_FITNESS'
  const weighsNote = input.weighsFood
    ? 'El atleta pesa los alimentos → da cantidades en gramos COCIDOS para proteínas y arroz; huevos en unidades.'
    : 'El atleta NO pesa → usa medidas caseras (unidades, tazas, cucharadas).'
  const restCarbsG = Math.round(macros.easy.carbs * 0.7)

  return `Eres nutricionista deportivo especializado en atletas LatAm. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra.

PERFIL:
- Peso: ${profile.weightKg}kg | Edad: ${profile.age}a | Deporte: ${sportLabel}
- TDEE: ${tdee} kcal/día | Peso objetivo: ${profile.weightGoalKg ? `${profile.weightGoalKg}kg` : 'mantenimiento/rendimiento'}

OBJETIVOS DIARIOS:
- Día duro:     ${macros.hard.kcal} kcal · ${macros.hard.protein}g prot · ${macros.hard.carbs}g CH · ${macros.hard.fat}g grasa
- Día fácil:    ${macros.easy.kcal} kcal · ${macros.easy.protein}g prot · ${macros.easy.carbs}g CH · ${macros.easy.fat}g grasa
- Día descanso: ${macros.rest.kcal} kcal · ${macros.rest.protein}g prot · ${restCarbsG}g CH · ${macros.rest.fat}g grasa

ALIMENTOS DISPONIBLES (usa SOLO estos): ${input.availableFoods.join(', ')}
RESTRICCIONES: ${input.restrictions.length > 0 ? input.restrictions.join(', ') : 'ninguna'}
${input.notes ? `NOTAS ADICIONALES: ${input.notes}` : ''}
COMIDAS POR DÍA: ${input.mealsPerDay}
${weighsNote}

REGLAS:
1. Distribuir proteína uniformemente entre las ${input.mealsPerDay} comidas
2. Carbos más altos en primera comida de días duros, mínimos en descanso
3. Los macros de todas las comidas deben sumar el objetivo del día (±5%)
4. Incluir 2-4 suplementos prácticos y económicos
5. 3-4 reglas de alimentación específicas para este atleta

{"hard":{"meals":[{"time":"string","label":"string","foods":"string con cantidades exactas","kcal":0,"protein":0,"carbs":0,"fat":0}],"supplements":[{"name":"string","dose":"string","when":"string","purpose":"string"}],"hydrationL":0.0,"rules":["string"]},"easy":{"meals":[...],"supplements":[...],"hydrationL":0.0,"rules":["string"]},"rest":{"meals":[...],"supplements":[...],"hydrationL":0.0,"rules":["string"]}}`
}

export async function callAIForMealPlan(prompt: string): Promise<unknown> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  const data = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  if (!data) throw new Error('No JSON in AI response')
  return data
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
  const restCarbs = Math.round(macros.easy.carbs * 0.6)

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
