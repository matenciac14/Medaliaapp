// NUT-PLANNED-01 — Convierte todos los PlannedMeals de HOY en FoodLog con un tap
// POST /api/athlete/nutrition/planned-meals/log-today
// Idempotente: skipDuplicates en createMany (@@unique([userId, foodId, date, mealType]))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const plannedMeals = await prisma.plannedMeal.findMany({
    where: { userId, date: { gte: today, lt: tomorrow } },
    include: {
      food: {
        select: {
          id: true,
          kcalPer100g: true,
          proteinPer100g: true,
          carbsPer100g: true,
          fatPer100g: true,
        },
      },
    },
  })

  if (plannedMeals.length === 0) {
    return NextResponse.json({ created: 0, message: 'Sin comidas planeadas para hoy' })
  }

  const data = plannedMeals.map((pm) => {
    const mult = pm.grams / 100
    return {
      userId,
      foodId:        pm.food.id,
      date:          today,
      mealType:      pm.mealType,
      grams:         pm.grams,
      kcalLogged:    Math.round(pm.food.kcalPer100g    * mult * 10) / 10,
      proteinLogged: Math.round(pm.food.proteinPer100g * mult * 10) / 10,
      carbsLogged:   Math.round(pm.food.carbsPer100g   * mult * 10) / 10,
      fatLogged:     Math.round(pm.food.fatPer100g     * mult * 10) / 10,
    }
  })

  const result = await prisma.foodLog.createMany({ data, skipDuplicates: true })

  return NextResponse.json({ created: result.count, total: plannedMeals.length })
}
