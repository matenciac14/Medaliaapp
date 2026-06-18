import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const foods = await prisma.food.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      category: true,
      kcalPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
      servingG: true,
      servingLabel: true,
    },
  })

  return NextResponse.json(foods)
}
