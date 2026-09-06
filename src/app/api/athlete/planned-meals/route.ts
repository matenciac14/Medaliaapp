import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getWeekMonday } from '@/lib/core/date_utils'
import { MealType } from '@/generated/prisma/enums'

const VALID_MEAL_TYPES = new Set(Object.values(MealType))

// GET /api/athlete/planned-meals?weekStart=YYYY-MM-DD
// Retorna las comidas planificadas del atleta para la semana indicada (o semana actual si no se pasa)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const userId = session.user.id
  const weekStartParam = req.nextUrl.searchParams.get('weekStart')
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })

  const weekStart = weekStartParam ? new Date(`${weekStartParam}T00:00:00.000Z`) : getWeekMonday(0, u?.timezone)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  const meals = await prisma.plannedMeal.findMany({
    where: { userId, date: { gte: weekStart, lte: weekEnd } },
    include: {
      food: {
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
      },
    },
    orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
  })

  // Agrupar por fecha
  const byDate: Record<string, typeof meals> = {}
  for (const meal of meals) {
    const dateStr = meal.date.toISOString().slice(0, 10)
    if (!byDate[dateStr]) byDate[dateStr] = []
    byDate[dateStr].push(meal)
  }

  return NextResponse.json({ weekStart: weekStart.toISOString().slice(0, 10), meals: byDate })
}

// POST /api/athlete/planned-meals — crear comida planificada
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const userId = session.user.id
  const body = await req.json() as { date?: string; mealType?: string; foodId?: string; grams?: number }

  if (!body.date || !body.mealType || !body.foodId || !body.grams) {
    return NextResponse.json({ error: 'date, mealType, foodId y grams son requeridos.' }, { status: 400 })
  }
  if (!VALID_MEAL_TYPES.has(body.mealType as MealType)) {
    return NextResponse.json({ error: 'mealType inválido.' }, { status: 400 })
  }
  const grams = Number(body.grams)
  if (isNaN(grams) || grams <= 0) {
    return NextResponse.json({ error: 'grams debe ser un número positivo.' }, { status: 400 })
  }

  const food = await prisma.food.findFirst({ where: { id: body.foodId, isActive: true }, select: { id: true } })
  if (!food) return NextResponse.json({ error: 'Alimento no encontrado.' }, { status: 404 })

  const meal = await prisma.plannedMeal.create({
    data: {
      userId,
      date: new Date(body.date),
      mealType: body.mealType as MealType,
      foodId: body.foodId,
      grams,
    },
    include: {
      food: {
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
      },
    },
  })

  return NextResponse.json({ meal }, { status: 201 })
}

