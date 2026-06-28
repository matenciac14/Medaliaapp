import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'
import { parseUserConfig } from '@/lib/config/user-config'
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
      goals: { where: { status: 'ACTIVE' }, take: 1 },
      trainingPlans: { where: { status: 'ACTIVE' }, take: 1 },
    },
  })

  if (!user?.profile) return Response.json({ error: 'Perfil de salud requerido' }, { status: 400 })

  const profile = user.profile
  const goal = user.goals[0]

  // Calcular TDEE con fórmulas
  const tdee = calculateTDEE(profile.weightKg, profile.heightCm, profile.age, (profile.gender ?? 'male') as 'male' | 'female', 5)
  const macros = calculateMacros(tdee, profile.weightKg, !!profile.weightGoalKg)

  // Guardar en DB
  const nutritionPlan = await prisma.nutritionPlan.upsert({
    where: { userId },
    update: {
      tdee,
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
    },
    create: {
      userId,
      tdee,
      targetKcalHard: macros.hard.kcal,
      targetKcalEasy: macros.easy.kcal,
      targetKcalRest: macros.rest.kcal,
      proteinG: macros.hard.protein,
      carbsHardG: macros.hard.carbs,
      carbsEasyG: macros.easy.carbs,
      fatG: macros.hard.fat,
    },
  })

  // Activar feature nutrition en config
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { config: true } })
  const config = parseUserConfig(existing?.config)
  await prisma.user.update({
    where: { id: userId },
    data: {
      config: {
        ...config,
        features: { ...config.features, nutrition: true, progress: true },
      },
    },
  })

  return Response.json({ ok: true, plan: nutritionPlan })
}
