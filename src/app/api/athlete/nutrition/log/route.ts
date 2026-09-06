import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { buildFoodLogResponse, parseFoodLogPost, calcMacros } from '@/domain/nutrition/calculate_food_log'
import { rateLimitAsync } from '@/lib/rate_limit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed: rlGet } = await rateLimitAsync(`web-${session.user.id}:nutrition-log`, { limit: 300, windowMs: 60_000 })
  if (!rlGet) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id
  const dateParam = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const dayStart = new Date(`${dateParam}T00:00:00.000Z`)
  const dayEnd   = new Date(`${dateParam}T23:59:59.999Z`)

  const [logs, nutritionPlan, todaySession] = await Promise.all([
    prisma.foodLog.findMany({
      where: { userId, date: { gte: dayStart, lte: dayEnd } },
      include: { food: { select: { name: true, category: true, servingG: true, servingLabel: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.plannedSession.findFirst({
      where: { week: { plan: { userId, status: 'ACTIVE' } }, date: { gte: dayStart, lte: dayEnd } },
      select: { intensity: true },
    }),
  ])

  return NextResponse.json(buildFoodLogResponse(logs, nutritionPlan, todaySession?.intensity, dateParam))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed: rlPost } = await rateLimitAsync(`web-${session.user.id}:nutrition-log`, { limit: 100, windowMs: 60_000 })
  if (!rlPost) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id
  const parsed = parseFoodLogPost(await req.json())
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { foodId, gramsNum, mealType, logDate } = parsed
  const food = await prisma.food.findUnique({ where: { id: foodId }, select: { id: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } })
  if (!food) return NextResponse.json({ error: 'Alimento no encontrado' }, { status: 404 })

  const snapshot = calcMacros(gramsNum, food)

  // Si el mismo alimento ya fue registrado en esta comida hoy, sumar los gramos (PERSIST-01)
  const existing = await prisma.foodLog.findUnique({
    where: { userId_foodId_date_mealType: { userId, foodId, date: logDate, mealType } },
    select: { id: true, grams: true },
  })

  if (existing) {
    const totalGrams = existing.grams + gramsNum
    const totalSnapshot = calcMacros(totalGrams, food)
    const log = await prisma.foodLog.update({
      where: { id: existing.id },
      data: {
        grams: totalGrams,
        kcalLogged: totalSnapshot.kcal, proteinLogged: totalSnapshot.proteinG,
        carbsLogged: totalSnapshot.carbsG, fatLogged: totalSnapshot.fatG,
      },
      include: { food: { select: { name: true, category: true, servingG: true, servingLabel: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } } },
    })
    return NextResponse.json({ ...log, ...totalSnapshot }, { status: 200 })
  }

  const log = await prisma.foodLog.create({
    data: {
      userId, foodId, grams: gramsNum, mealType, date: logDate,
      kcalLogged: snapshot.kcal, proteinLogged: snapshot.proteinG, carbsLogged: snapshot.carbsG, fatLogged: snapshot.fatG,
    },
    include: { food: { select: { name: true, category: true, servingG: true, servingLabel: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true } } },
  })

  return NextResponse.json({ ...log, ...snapshot }, { status: 201 })
}
