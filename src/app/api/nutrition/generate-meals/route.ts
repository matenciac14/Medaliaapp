import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'
import { rateLimitAsync } from '@/lib/rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type GenerateMealsBody = {
  availableFoods: string[]
  restrictions: string[]
  mealsPerDay: number
  weighsFood: boolean
  notes?: string
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`nutrition-meals:${session.user.id}`, { limit: 3, windowMs: 60 * 60_000 }) // 3/hora
  if (!allowed) return Response.json({ error: 'Límite de generaciones alcanzado. Intenta más tarde.' }, { status: 429 })

  const userId = session.user.id

  const body: GenerateMealsBody = await req.json()
  const { availableFoods, restrictions, mealsPerDay, weighsFood, notes } = body

  if (!availableFoods || availableFoods.length < 2) {
    return Response.json({ error: 'Agrega al menos 2 alimentos disponibles' }, { status: 400 })
  }

  // Obtener perfil del atleta
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, goals: { where: { status: 'ACTIVE' }, take: 1 } },
  })

  if (!user?.profile) {
    return Response.json({ error: 'Perfil de salud requerido' }, { status: 400 })
  }

  const profile = user.profile
  const goal = user.goals[0]

  // Calcular o reutilizar TDEE + macros
  const tdee = calculateTDEE(
    profile.weightKg,
    profile.heightCm,
    profile.age,
    (profile.gender ?? 'male') as 'male' | 'female',
    5
  )
  const macros = calculateMacros(tdee, profile.weightKg, !!profile.weightGoalKg)

  // Upsert FoodProfile
  await prisma.foodProfile.upsert({
    where: { userId },
    create: { userId, availableFoods, restrictions, mealsPerDay, weighsFood, notes },
    update: { availableFoods, restrictions, mealsPerDay, weighsFood, notes },
  })

  // Upsert NutritionPlan (por si acaso no existe)
  await prisma.nutritionPlan.upsert({
    where: { userId },
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
    update: {},
  })

  const sportLabel = profile.sport ?? goal?.type ?? 'GENERAL_FITNESS'
  const weighsNote = weighsFood
    ? 'El atleta pesa los alimentos → da cantidades en gramos COCIDOS para proteínas y arroz; huevos en unidades.'
    : 'El atleta NO pesa → usa medidas caseras (unidades, tazas, cucharadas).'
  const restCarbsG = Math.round(macros.easy.carbs * 0.7)

  const prompt = `Eres nutricionista deportivo especializado en atletas LatAm. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra.

PERFIL:
- Peso: ${profile.weightKg}kg | Edad: ${profile.age}a | Deporte: ${sportLabel}
- TDEE: ${tdee} kcal/día | Peso objetivo: ${profile.weightGoalKg ? `${profile.weightGoalKg}kg` : 'mantenimiento/rendimiento'}

OBJETIVOS DIARIOS:
- Día duro:     ${macros.hard.kcal} kcal · ${macros.hard.protein}g prot · ${macros.hard.carbs}g CH · ${macros.hard.fat}g grasa
- Día fácil:    ${macros.easy.kcal} kcal · ${macros.easy.protein}g prot · ${macros.easy.carbs}g CH · ${macros.easy.fat}g grasa
- Día descanso: ${macros.rest.kcal} kcal · ${macros.rest.protein}g prot · ${restCarbsG}g CH · ${macros.rest.fat}g grasa

ALIMENTOS DISPONIBLES (usa SOLO estos): ${availableFoods.join(', ')}
RESTRICCIONES: ${restrictions.length > 0 ? restrictions.join(', ') : 'ninguna'}
${notes ? `NOTAS ADICIONALES: ${notes}` : ''}
COMIDAS POR DÍA: ${mealsPerDay}
${weighsNote}

REGLAS:
1. Distribuir proteína uniformemente entre las ${mealsPerDay} comidas
2. Carbos más altos en primera comida de días duros, mínimos en descanso
3. Los macros de todas las comidas deben sumar el objetivo del día (±5%)
4. Incluir 2-4 suplementos prácticos y económicos
5. 3-4 reglas de alimentación específicas para este atleta

{"hard":{"meals":[{"time":"string","label":"string","foods":"string con cantidades exactas","kcal":0,"protein":0,"carbs":0,"fat":0}],"supplements":[{"name":"string","dose":"string","when":"string","purpose":"string"}],"hydrationL":0.0,"rules":["string"]},"easy":{"meals":[...],"supplements":[...],"hydrationL":0.0,"rules":["string"]},"rest":{"meals":[...],"supplements":[...],"hydrationL":0.0,"rules":["string"]}}`

  let mealData: unknown
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    // Extraer JSON incluso si viene con algo extra
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    mealData = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!mealData) throw new Error('No JSON in response')
  } catch (err) {
    console.error('[generate-meals] AI error:', err)
    return Response.json({ error: 'Error al generar el plan nutricional. Intenta de nuevo.' }, { status: 500 })
  }

  // Guardar MealPlan en DB
  const mealPlan = await prisma.mealPlan.upsert({
    where: { userId },
    create: { userId, data: mealData as object },
    update: { data: mealData as object, generatedAt: new Date() },
  })

  return Response.json({ ok: true, mealPlanId: mealPlan.id })
}
