export type FoodLookupResult = {
  barcode:       string
  name:          string
  kcalPer100g:   number
  proteinPer100g: number
  carbsPer100g:  number
  fatPer100g:    number
  fiberPer100g?: number
  servingG?:     number
  servingLabel?: string
  country?:      string
}

export interface IFoodLookupClient {
  lookupByBarcode(code: string): Promise<FoodLookupResult | null>
}
