/**
 * Shared nutrition log logic — used by web and mobile log routes.
 */

import { intensityToDayType, type DayType } from '@/lib/nutrition/day-type'

type FoodMacros = {
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

type NutritionPlan = {
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
}

export type MacroTotals = { kcal: number; proteinG: number; carbsG: number; fatG: number }

export function calcMacros(grams: number, food: FoodMacros): MacroTotals {
  const r = grams / 100
  return {
    kcal:     Math.round(food.kcalPer100g    * r),
    proteinG: Math.round(food.proteinPer100g * r * 10) / 10,
    carbsG:   Math.round(food.carbsPer100g   * r * 10) / 10,
    fatG:     Math.round(food.fatPer100g     * r * 10) / 10,
  }
}

export function calcNutritionTarget(
  nutritionPlan: NutritionPlan,
  dayType: DayType
): MacroTotals {
  return {
    kcal:     dayType === 'hard' ? nutritionPlan.targetKcalHard : dayType === 'rest' ? nutritionPlan.targetKcalRest : nutritionPlan.targetKcalEasy,
    proteinG: nutritionPlan.proteinG,
    carbsG:   dayType === 'hard' ? nutritionPlan.carbsHardG : nutritionPlan.carbsEasyG,
    fatG:     nutritionPlan.fatG,
  }
}

export function calcProgressPct(totals: MacroTotals, target: MacroTotals): MacroTotals {
  return {
    kcal:     target.kcal     > 0 ? Math.round((totals.kcal     / target.kcal)     * 100) : 0,
    proteinG: target.proteinG > 0 ? Math.round((totals.proteinG / target.proteinG) * 100) : 0,
    carbsG:   target.carbsG   > 0 ? Math.round((totals.carbsG   / target.carbsG)   * 100) : 0,
    fatG:     target.fatG     > 0 ? Math.round((totals.fatG     / target.fatG)     * 100) : 0,
  }
}

export function buildFoodLogResponse(
  logs: Array<{ id: string; foodId: string; food: FoodMacros & { name: string; category: string; servingG: number; servingLabel: string | null }; grams: number; mealType: string; date: Date }>,
  nutritionPlan: NutritionPlan | null,
  sessionIntensity: string | null | undefined,
  dateParam: string
) {
  const dayType: DayType = intensityToDayType(sessionIntensity)

  const logsWithMacros = logs.map(log => ({
    id:       log.id,
    foodId:   log.foodId,
    food:     log.food,
    grams:    log.grams,
    mealType: log.mealType,
    date:     log.date,
    ...calcMacros(log.grams, log.food),
  }))

  const totals = logsWithMacros.reduce<MacroTotals>(
    (acc, l) => ({ kcal: acc.kcal + l.kcal, proteinG: acc.proteinG + l.proteinG, carbsG: acc.carbsG + l.carbsG, fatG: acc.fatG + l.fatG }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  const target = nutritionPlan ? calcNutritionTarget(nutritionPlan, dayType) : null
  const pct    = target ? calcProgressPct(totals, target) : null

  return { date: dateParam, dayType, logs: logsWithMacros, totals, target, pct }
}

export function parseFoodLogPost(body: unknown): { foodId: string; gramsNum: number; mealType: string; logDate: Date } | { error: string } {
  const { foodId, grams, mealType, date } = body as { foodId?: string; grams?: unknown; mealType?: string; date?: string }
  if (!foodId || !grams || !mealType) return { error: 'foodId, grams y mealType son requeridos' }
  const gramsNum = Number(grams)
  if (isNaN(gramsNum) || gramsNum <= 0) return { error: 'grams debe ser un número positivo' }
  const logDate = date
    ? new Date(`${date}T00:00:00.000Z`)
    : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
  return { foodId, gramsNum, mealType, logDate }
}
