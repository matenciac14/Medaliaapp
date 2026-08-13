import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-foods`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const userId = mobile.id

  const [foods, foodProfile] = await Promise.all([
    prisma.food.findMany({
      where: {
        isActive: true,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 50,
      select: {
        id: true,
        name: true,
        category: true,
        kcalPer100g: true,
        proteinPer100g: true,
        carbsPer100g: true,
        fatPer100g: true,
        fiberPer100g: true,
        calciumMg: true,
        ironMg: true,
        potassiumMg: true,
        vitaminCMg: true,
        magnesiumMg: true,
        servingG: true,
        servingLabel: true,
      },
    }),
    prisma.foodProfile.findUnique({
      where: { userId },
      select: { availableFoodIds: true },
    }),
  ])

  // Priorizar alimentos del atleta al inicio de la lista
  if (foodProfile?.availableFoodIds?.length) {
    const preferred = new Set(foodProfile.availableFoodIds)
    foods.sort((a, b) => {
      const aPreferred = preferred.has(a.id) ? 0 : 1
      const bPreferred = preferred.has(b.id) ? 0 : 1
      return aPreferred - bPreferred
    })
  }

  return NextResponse.json(foods)
}
