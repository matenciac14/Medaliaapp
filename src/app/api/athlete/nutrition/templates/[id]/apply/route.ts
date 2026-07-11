import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { MealType, NutritionDayType } from '@/generated/prisma/enums'
import { z } from 'zod'

const bodySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStart debe ser YYYY-MM-DD'),
  intensityMap: z.record(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.enum(['HARD', 'EASY', 'REST'])
  ),
})

// POST /api/athlete/nutrition/templates/[id]/apply
// Aplica una plantilla nutricional a una semana → crea registros PlannedMeal
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const userId = session.user.id
  const { id } = await params

  const rawBody = await req.json()
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido.' }, { status: 400 })
  }
  const { weekStart: weekStartStr, intensityMap } = parsed.data

  // Verificar que el template pertenece al atleta (multi-tenant: athleteId = userId)
  const template = await prisma.nutritionTemplate.findUnique({
    where: { id, athleteId: userId },
    include: {
      days: {
        include: {
          meals: {
            include: {
              items: {
                select: { foodId: true, grams: true },
              },
            },
          },
        },
      },
    },
  })
  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })

  const weekStart = new Date(weekStartStr)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Indexar días por dayType para lookup O(1)
  const daysByType = new Map(template.days.map((d) => [d.dayType, d]))

  // Construir registros PlannedMeal para cada fecha del intensityMap
  const records: Array<{ userId: string; date: Date; mealType: MealType; foodId: string; grams: number }> = []
  for (const [dateStr, dayType] of Object.entries(intensityMap)) {
    const templateDay = daysByType.get(dayType as NutritionDayType)
    if (!templateDay) continue

    const date = new Date(dateStr)
    date.setHours(12, 0, 0, 0) // mediodía para evitar drift de timezone

    for (const meal of templateDay.meals) {
      for (const item of meal.items) {
        records.push({
          userId,
          date,
          mealType: meal.mealType as MealType,
          foodId: item.foodId,
          grams: item.grams,
        })
      }
    }
  }

  // Reemplazar PlannedMeal de la semana con los nuevos registros (idempotente)
  await prisma.$transaction(async (tx) => {
    await tx.plannedMeal.deleteMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
    })
    if (records.length > 0) {
      await tx.plannedMeal.createMany({ data: records })
    }
  })

  return NextResponse.json({ ok: true, created: records.length })
}
