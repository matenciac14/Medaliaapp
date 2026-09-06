import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { requireFeature } from '@/lib/guards/feature_gate'
import { calcMacros } from '@/domain/nutrition/calculate_food_log'

// POST /api/mobile/nutrition/plan/[id]/log
// Convierte un PlannedMeal → FoodLog con 1 tap (idempotente: si ya fue registrado, suma gramos)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-plan-log`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const { id: plannedMealId } = await params

  const plannedMeal = await prisma.plannedMeal.findFirst({
    where: { id: plannedMealId, userId },
    include: {
      food: {
        select: {
          id: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
        },
      },
    },
  })
  if (!plannedMeal) return NextResponse.json({ error: 'Comida planificada no encontrada.' }, { status: 404 })

  const { food, grams, mealType, date } = plannedMeal
  const logDate = new Date(`${date.toISOString().split('T')[0]}T00:00:00.000Z`)
  const snapshot = calcMacros(grams, food)

  // Upsert: si el mismo alimento ya fue registrado en esta comida hoy, sumar gramos
  const existing = await prisma.foodLog.findUnique({
    where: { userId_foodId_date_mealType: { userId, foodId: food.id, date: logDate, mealType } },
    select: { id: true, grams: true },
  })

  if (existing) {
    const totalGrams = existing.grams + grams
    const totalSnapshot = calcMacros(totalGrams, food)
    await prisma.foodLog.update({
      where: { id: existing.id },
      data: {
        grams: totalGrams,
        kcalLogged:    totalSnapshot.kcal,
        proteinLogged: totalSnapshot.proteinG,
        carbsLogged:   totalSnapshot.carbsG,
        fatLogged:     totalSnapshot.fatG,
      },
    })
    return NextResponse.json({ ok: true, action: 'updated', totalGrams })
  }

  await prisma.foodLog.create({
    data: {
      userId,
      foodId: food.id,
      grams,
      mealType,
      date: logDate,
      kcalLogged:    snapshot.kcal,
      proteinLogged: snapshot.proteinG,
      carbsLogged:   snapshot.carbsG,
      fatLogged:     snapshot.fatG,
    },
  })

  return NextResponse.json({ ok: true, action: 'created' }, { status: 201 })
}
