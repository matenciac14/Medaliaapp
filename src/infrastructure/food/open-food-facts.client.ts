import type { IFoodLookupClient, FoodLookupResult } from '../../domain/ports/food-lookup.client'

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product'

export class OpenFoodFactsClient implements IFoodLookupClient {
  async lookupByBarcode(code: string): Promise<FoodLookupResult | null> {
    try {
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(code)}?fields=product_name,nutriments,serving_size,serving_quantity,countries_tags`, {
        headers: { 'User-Agent': 'Medaliq/1.0 (contact@medaliq.com)' },
        signal: AbortSignal.timeout(5_000),
      })

      if (!res.ok) return null

      const json = await res.json() as {
        status: number
        product?: {
          product_name?: string
          nutriments?: {
            'energy-kcal_100g'?: number
            proteins_100g?: number
            carbohydrates_100g?: number
            fat_100g?: number
            fiber_100g?: number
          }
          serving_quantity?: number
          serving_size?: string
          countries_tags?: string[]
        }
      }

      if (json.status !== 1 || !json.product) return null

      const p = json.product
      const n = p.nutriments ?? {}

      const kcal    = n['energy-kcal_100g']
      const protein = n['proteins_100g']
      const carbs   = n['carbohydrates_100g']
      const fat     = n['fat_100g']

      // Requerimos al menos nombre y macros principales
      if (!p.product_name || kcal == null || protein == null || carbs == null || fat == null) {
        return null
      }

      const country = p.countries_tags?.[0]?.replace('en:', '') ?? undefined

      return {
        barcode:        code,
        name:           p.product_name.trim(),
        kcalPer100g:    Math.round(kcal),
        proteinPer100g: Math.round(protein * 10) / 10,
        carbsPer100g:   Math.round(carbs * 10) / 10,
        fatPer100g:     Math.round(fat * 10) / 10,
        fiberPer100g:   n.fiber_100g != null ? Math.round(n.fiber_100g * 10) / 10 : undefined,
        servingG:       p.serving_quantity ?? undefined,
        servingLabel:   p.serving_size ?? undefined,
        country,
      }
    } catch {
      return null
    }
  }
}
