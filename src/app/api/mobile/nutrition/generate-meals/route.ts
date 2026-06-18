import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { parseUserConfig } from '@/lib/config/user-config'
import {
  computeNutritionTargets,
  buildMealPlanPrompt,
  callAIForMealPlan,
  buildStaticMealPlan,
  type GenerateMealsInput,
} from '@/domain/nutrition/generate-meal-plan'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = mobile.id
  const { allowed } = await rateLimitAsync(`nutrition-meals:${userId}`, { limit: 3, windowMs: 60 * 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Límite de generaciones alcanzado. Intenta más tarde.' }, { status: 429 })

  const body: GenerateMealsInput = await req.json()
  if (!body.availableFoods || body.availableFoods.length < 2)
    return NextResponse.json({ error: 'Agrega al menos 2 alimentos disponibles' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, goals: { where: { status: 'ACTIVE' }, take: 1 } },
  })
  if (!user?.profile) return NextResponse.json({ error: 'Perfil de salud requerido' }, { status: 400 })

  if (!parseUserConfig(user.config).features.aiPlan) {
    return NextResponse.json({ error: 'Plan Pro requerido para generar plan de comidas con IA.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { tdee, macros } = computeNutritionTargets(user.profile)

  await Promise.all([
    prisma.foodProfile.upsert({
      where: { userId },
      create: { userId, ...body },
      update: body,
    }),
    prisma.nutritionPlan.upsert({
      where: { userId },
      create: { userId, tdee, targetKcalHard: macros.hard.kcal, targetKcalEasy: macros.easy.kcal, targetKcalRest: macros.rest.kcal, proteinG: macros.hard.protein, carbsHardG: macros.hard.carbs, carbsEasyG: macros.easy.carbs, fatG: macros.hard.fat },
      update: {},
    }),
  ])

  let mealData: unknown
  try {
    const prompt = buildMealPlanPrompt(user.profile, macros, tdee, user.goals[0]?.type, body)
    mealData = await callAIForMealPlan(prompt)
  } catch (err) {
    console.error('[mobile/generate-meals] AI error, using static fallback:', err)
    mealData = buildStaticMealPlan(macros, body)
  }

  const mealPlan = await prisma.mealPlan.upsert({
    where: { userId },
    create: { userId, data: mealData as object },
    update: { data: mealData as object, generatedAt: new Date() },
  })

  return NextResponse.json({ ok: true, mealPlanId: mealPlan.id })
}
