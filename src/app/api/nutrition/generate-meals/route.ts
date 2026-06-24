import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate-limit'
import {
  computeNutritionTargets,
  buildStaticMealPlan,
  type GenerateMealsInput,
} from '@/domain/nutrition/generate-meal-plan'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const { allowed } = await rateLimitAsync(`nutrition-meals:${userId}`, { limit: 3, windowMs: 60 * 60_000 })
  if (!allowed) return Response.json({ error: 'Límite de generaciones alcanzado. Intenta más tarde.' }, { status: 429 })

  const body: GenerateMealsInput = await req.json()
  if (!body.availableFoods || body.availableFoods.length < 2)
    return Response.json({ error: 'Agrega al menos 2 alimentos disponibles' }, { status: 400 })

  const { availableFoods, availableFoodIds, restrictions, mealsPerDay, weighsFood, notes } = body

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, goals: { where: { status: 'ACTIVE' }, take: 1 } },
  })
  if (!user?.profile) return Response.json({ error: 'Perfil de salud requerido' }, { status: 400 })


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

  const mealData = buildStaticMealPlan(macros, body)

  const mealPlan = await prisma.mealPlan.upsert({
    where: { userId },
    create: { userId, data: mealData as object },
    update: { data: mealData as object, generatedAt: new Date() },
  })

  return Response.json({ ok: true, mealPlanId: mealPlan.id })
}
