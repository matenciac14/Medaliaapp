import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { MealType } from '@/generated/prisma/enums'

const VALID_MEAL_TYPES = new Set(Object.values(MealType))

function getThisMonday(): Date {
  const now = new Date()
  const dow = now.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now)
  monday.setDate(monday.getDate() + offset)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// GET /api/coach/athlete/[id]/nutrition/plan?week=YYYY-MM-DD
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
    select: { id: true },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const weekParam = req.nextUrl.searchParams.get('week')
  const weekStart = weekParam ? new Date(weekParam) : getThisMonday()
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const meals = await prisma.plannedMeal.findMany({
    where: { userId: athleteId, date: { gte: weekStart, lte: weekEnd } },
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

  const byDate: Record<string, typeof meals> = {}
  for (const meal of meals) {
    const dateStr = meal.date.toISOString().slice(0, 10)
    if (!byDate[dateStr]) byDate[dateStr] = []
    byDate[dateStr].push(meal)
  }

  return NextResponse.json({ weekStart: weekStart.toISOString().slice(0, 10), meals: byDate })
}

// POST /api/coach/athlete/[id]/nutrition/plan
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
    select: { id: true },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = (await req.json()) as { date?: string; mealType?: string; foodId?: string; grams?: number }

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
      userId: athleteId,
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
