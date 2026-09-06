// NUT-PLANNED-01 (mobile) — POST /api/mobile/nutrition/planned-meals/log-today
// Convierte todos los PlannedMeals de HOY en FoodLog con un tap (idempotente)

import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'
import { prisma } from '@/lib/db/prisma'
import { calcMacros } from '@/domain/nutrition/calculate_food_log'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:log-today`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const plannedMeals = await prisma.plannedMeal.findMany({
    where: { userId, date: { gte: today, lt: tomorrow } },
    include: {
      food: { select: { id: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } },
    },
  })

  if (plannedMeals.length === 0) return NextResponse.json({ created: 0 })

  const data = plannedMeals.map((pm) => {
    const snapshot = calcMacros(pm.grams, pm.food)
    return {
      userId,
      foodId:        pm.food.id,
      date:          today,
      mealType:      pm.mealType,
      grams:         pm.grams,
      kcalLogged:    snapshot.kcal,
      proteinLogged: snapshot.proteinG,
      carbsLogged:   snapshot.carbsG,
      fatLogged:     snapshot.fatG,
    }
  })

  const result = await prisma.foodLog.createMany({ data, skipDuplicates: true })

  return NextResponse.json({ created: result.count, total: plannedMeals.length })
}
