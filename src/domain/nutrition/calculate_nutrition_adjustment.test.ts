import { describe, it, expect } from 'vitest'
import { calcNutritionAdjustment, type AdjustmentPlan } from './calculate_nutrition_adjustment'

const plan: AdjustmentPlan = {
  targetKcalHard: 2800,
  targetKcalEasy: 2300,
  targetKcalRest: 1900,
  carbsHardG: 350,
  carbsEasyG: 260,
}

// Valores derivados del plan de prueba
// HIGH     = 2800 kcal / 350g carbs
// MODERATE = 2300 kcal / 260g carbs
// LOW      = round(2300 * 0.88) = 2024 kcal / round(260 * 0.75) = 195g carbs
// REST     = 1900 kcal / round(260 * 0.7) = 182g carbs

describe('calcNutritionAdjustment', () => {
  describe('retorna null cuando intensidades son iguales', () => {
    it('HIGH === HIGH', () => {
      expect(calcNutritionAdjustment('HIGH', 'HIGH', plan)).toBeNull()
    })

    it('MODERATE === MODERATE', () => {
      expect(calcNutritionAdjustment('MODERATE', 'MODERATE', plan)).toBeNull()
    })

    it('LOW === LOW', () => {
      expect(calcNutritionAdjustment('LOW', 'LOW', plan)).toBeNull()
    })

    it('REST === REST', () => {
      expect(calcNutritionAdjustment('REST', 'REST', plan)).toBeNull()
    })
  })

  describe('delta negativo — sesión menos intensa de lo planeado', () => {
    it('HIGH → MODERATE: kcal y carbs bajan', () => {
      const result = calcNutritionAdjustment('HIGH', 'MODERATE', plan)
      expect(result).not.toBeNull()
      expect(result!.plannedKcal).toBe(2800)
      expect(result!.plannedCarbsG).toBe(350)
      expect(result!.adjustedKcal).toBe(2300)
      expect(result!.adjustedCarbsG).toBe(260)
      expect(result!.deltaKcal).toBe(-500)
      expect(result!.deltaCarbsG).toBe(-90)
    })

    it('HIGH → REST: mayor delta negativo', () => {
      const result = calcNutritionAdjustment('HIGH', 'REST', plan)
      expect(result).not.toBeNull()
      expect(result!.plannedKcal).toBe(2800)
      expect(result!.plannedCarbsG).toBe(350)
      expect(result!.adjustedKcal).toBe(1900)
      expect(result!.adjustedCarbsG).toBe(182)   // round(260 * 0.7)
      expect(result!.deltaKcal).toBe(-900)
      expect(result!.deltaCarbsG).toBe(-168)
    })

    it('MODERATE → LOW: aplica factores 0.88 y 0.75', () => {
      const result = calcNutritionAdjustment('MODERATE', 'LOW', plan)
      expect(result).not.toBeNull()
      expect(result!.plannedKcal).toBe(2300)
      expect(result!.plannedCarbsG).toBe(260)
      expect(result!.adjustedKcal).toBe(2024)     // round(2300 * 0.88)
      expect(result!.adjustedCarbsG).toBe(195)    // round(260 * 0.75)
      expect(result!.deltaKcal).toBe(2024 - 2300)
      expect(result!.deltaCarbsG).toBe(195 - 260)
    })

    it('HIGH → LOW: combinación extrema', () => {
      const result = calcNutritionAdjustment('HIGH', 'LOW', plan)
      expect(result).not.toBeNull()
      expect(result!.plannedKcal).toBe(2800)
      expect(result!.plannedCarbsG).toBe(350)
      expect(result!.adjustedKcal).toBe(2024)
      expect(result!.adjustedCarbsG).toBe(195)
      expect(result!.deltaKcal).toBe(2024 - 2800)
      expect(result!.deltaCarbsG).toBe(195 - 350)
    })
  })

  describe('delta positivo — sesión más intensa de lo planeado', () => {
    it('MODERATE → HIGH: kcal y carbs suben', () => {
      const result = calcNutritionAdjustment('MODERATE', 'HIGH', plan)
      expect(result).not.toBeNull()
      expect(result!.plannedKcal).toBe(2300)
      expect(result!.plannedCarbsG).toBe(260)
      expect(result!.adjustedKcal).toBe(2800)
      expect(result!.adjustedCarbsG).toBe(350)
      expect(result!.deltaKcal).toBe(500)
      expect(result!.deltaCarbsG).toBe(90)
    })

    it('REST → HIGH: delta positivo desde el más bajo al más alto', () => {
      const result = calcNutritionAdjustment('REST', 'HIGH', plan)
      expect(result).not.toBeNull()
      expect(result!.plannedKcal).toBe(1900)
      expect(result!.plannedCarbsG).toBe(182)     // round(260 * 0.7)
      expect(result!.adjustedKcal).toBe(2800)
      expect(result!.adjustedCarbsG).toBe(350)
      expect(result!.deltaKcal).toBe(900)
      expect(result!.deltaCarbsG).toBe(168)
    })
  })

  describe('aritmética explícita — invariantes', () => {
    it('deltaKcal === adjustedKcal - plannedKcal', () => {
      const result = calcNutritionAdjustment('LOW', 'HIGH', plan)
      expect(result).not.toBeNull()
      expect(result!.deltaKcal).toBe(result!.adjustedKcal - result!.plannedKcal)
    })

    it('deltaCarbsG === adjustedCarbsG - plannedCarbsG', () => {
      const result = calcNutritionAdjustment('REST', 'MODERATE', plan)
      expect(result).not.toBeNull()
      expect(result!.deltaCarbsG).toBe(result!.adjustedCarbsG - result!.plannedCarbsG)
    })

    it('plannedKcal y adjustedKcal son consistentes con el plan', () => {
      const highToModerate = calcNutritionAdjustment('HIGH', 'MODERATE', plan)
      expect(highToModerate!.plannedKcal).toBe(plan.targetKcalHard)
      expect(highToModerate!.adjustedKcal).toBe(plan.targetKcalEasy)

      const restToHigh = calcNutritionAdjustment('REST', 'HIGH', plan)
      expect(restToHigh!.plannedKcal).toBe(plan.targetKcalRest)
      expect(restToHigh!.adjustedKcal).toBe(plan.targetKcalHard)
    })
  })
})
