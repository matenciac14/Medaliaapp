import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [mealPlan, foodProfile, foodLogs] = await Promise.all([
    prisma.mealPlan.findUnique({ where: { userId: athleteId } }),
    prisma.foodProfile.findUnique({ where: { userId: athleteId } }),
    prisma.foodLog.findMany({
      where: { userId: athleteId, date: { gte: sevenDaysAgo } },
      select: {
        id: true,
        date: true,
        mealType: true,
        kcalLogged: true,
        proteinLogged: true,
        carbsLogged: true,
        fatLogged: true,
        food: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    }),
  ])

  // Resolver alimentos del atleta desde el catálogo (para el constructor visual)
  const athleteFoods = foodProfile?.availableFoodIds?.length
    ? await prisma.food.findMany({
        where: { id: { in: foodProfile.availableFoodIds }, isActive: true },
        select: {
          id: true, name: true, category: true,
          kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
          servingG: true, servingLabel: true,
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
    : []

  return NextResponse.json({ mealPlan, foodProfile, athleteFoods, foodLogs })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  // Verify coach-athlete relationship
  const link = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId },
  })
  if (!link) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = (await request.json()) as Record<string, unknown>
  const fields = [
    'tdee',
    'targetKcalHard',
    'targetKcalEasy',
    'targetKcalRest',
    'proteinG',
    'carbsHardG',
    'carbsEasyG',
    'fatG',
  ]
  const data: Record<string, number> = {}
  for (const f of fields) {
    const v = Number(body[f])
    if (!isNaN(v) && v > 0) data[f] = Math.round(v)
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const updated = await prisma.nutritionPlan.update({
    where: { userId: athleteId },
    data,
  })

  return NextResponse.json({ ok: true, plan: updated })
}
