import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { requireFeature } from '@/lib/guards/feature-gate'
import {
  computeNutritionTargets,
  buildStaticMealPlan,
  type GenerateMealsInput,
  type DbFood,
} from '@/domain/nutrition/generate-meal-plan'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const featureGuard = requireFeature(mobile.features, 'nutrition')
  if (featureGuard) return featureGuard

  const userId = mobile.id
  const { allowed } = await rateLimitAsync(`nutrition-meals:${userId}`, { limit: 3, windowMs: 60 * 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Límite de generaciones alcanzado. Intenta más tarde.' }, { status: 429 })

  const body: GenerateMealsInput = await req.json()
  if (!body.availableFoods || body.availableFoods.length < 2)
    return NextResponse.json({ error: 'Agrega al menos 2 alimentos disponibles' }, { status: 400 })

  const { availableFoods, availableFoodIds, restrictions, mealsPerDay, weighsFood, notes } = body

  const foodSelect = { name: true, category: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true, servingG: true, servingLabel: true } as const

  const [user, dbFoods] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, goals: { where: { status: 'ACTIVE' }, take: 1 } },
    }),
    availableFoodIds && availableFoodIds.length > 0
      ? prisma.food.findMany({ where: { isActive: true, id: { in: availableFoodIds } }, select: foodSelect })
      : Promise.resolve([] as DbFood[]),
  ])

  if (!user?.profile) return NextResponse.json({ error: 'Perfil de salud requerido' }, { status: 400 })

  const { tdee, macros } = computeNutritionTargets(user.profile)

  const foodProfileData = {
    availableFoods,
    restrictions: restrictions ?? [],
    mealsPerDay: mealsPerDay ?? 3,
    weighsFood: weighsFood ?? false,
    ...(notes !== undefined ? { notes } : {}),
    ...(availableFoodIds && availableFoodIds.length > 0 ? { availableFoodIds } : {}),
  }
  await Promise.all([
    prisma.foodProfile.upsert({
      where: { userId },
      create: { userId, ...foodProfileData },
      update: foodProfileData,
    }),
    prisma.nutritionPlan.upsert({
      where: { userId },
      create: { userId, tdee, targetKcalHard: macros.hard.kcal, targetKcalEasy: macros.easy.kcal, targetKcalRest: macros.rest.kcal, proteinG: macros.hard.protein, carbsHardG: macros.hard.carbs, carbsEasyG: macros.easy.carbs, fatG: macros.hard.fat },
      update: {},
    }),
  ])

  const mealData = buildStaticMealPlan(macros, body, dbFoods.length > 0 ? dbFoods : undefined)

  const mealPlan = await prisma.mealPlan.upsert({
    where: { userId },
    create: { userId, data: mealData as object },
    update: { data: mealData as object, generatedAt: new Date() },
  })

  return NextResponse.json({ ok: true, mealPlanId: mealPlan.id })
}
