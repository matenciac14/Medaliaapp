import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'
import { rateLimitAsync } from '@/lib/rate-limit'

export async function POST(_req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`nutrition-generate:${session.user.id}`, { limit: 3, windowMs: 60 * 60_000 }) // 3/hora
  if (!allowed) return Response.json({ error: 'Límite de generaciones alcanzado. Intenta más tarde.' }, { status: 429 })

  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      trainingPlans: { where: { status: 'ACTIVE' }, take: 1 },
    },
  })

  if (!user?.profile) return Response.json({ error: 'Perfil de salud requerido' }, { status: 400 })

  const profile = user.profile

  // Calcular TDEE con fórmulas
  const tdee = calculateTDEE(profile.weightKg, profile.heightCm, profile.age, (profile.gender === 'female' ? 'female' : 'male') as 'male' | 'female', 5)
  const macros = calculateMacros(tdee, profile.weightKg, !!profile.weightGoalKg)

  // PERSIST-04: upsert + enableFeatures en una sola tx — si enableFeatures falla,
  // el plan no queda sin features activas.
  const nutritionPlanData = {
    tdee,
    targetKcalHard: macros.hard.kcal,
    targetKcalEasy: macros.easy.kcal,
    targetKcalRest: macros.rest.kcal,
    proteinG: macros.hard.protein,
    carbsHardG: macros.hard.carbs,
    carbsEasyG: macros.easy.carbs,
    fatG: macros.hard.fat,
  }
  const [nutritionPlan] = await prisma.$transaction([
    prisma.nutritionPlan.upsert({
      where: { userId },
      update: nutritionPlanData,
      create: { userId, ...nutritionPlanData },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { featureNutrition: true, featureProgress: true },
    }),
  ])

  return Response.json({ ok: true, plan: nutritionPlan })
}
