// MOB-NUT-04 — GET /api/mobile/nutrition/templates
// Lista las NutritionTemplates propias del atleta B2C (athleteId = userId)

import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:nutrition-templates`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const templates = await prisma.nutritionTemplate.findMany({
    where: { athleteId: mobile.id },
    select: {
      id: true,
      name: true,
      goal: true,
      days: {
        select: {
          id: true,
          dayType: true,
          meals: {
            select: {
              id: true,
              mealType: true,
              items: { select: { id: true, grams: true, food: { select: { name: true, kcalPer100g: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
}
