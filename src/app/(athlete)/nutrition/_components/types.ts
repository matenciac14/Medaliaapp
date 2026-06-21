export type FoodItem = {
  id: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g: number | null
  calciumMg: number | null
  ironMg: number | null
  potassiumMg: number | null
  vitaminCMg: number | null
  magnesiumMg: number | null
  servingG: number
  servingLabel: string | null
}
