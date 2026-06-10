import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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
      fiberPer100g: true,
      calciumMg: true,
      ironMg: true,
      potassiumMg: true,
      vitaminCMg: true,
      magnesiumMg: true,
      servingG: true,
      servingLabel: true,
    },
  })

  return NextResponse.json(foods)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    name, category,
    kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g,
    fiberPer100g, calciumMg, ironMg, potassiumMg, vitaminCMg, magnesiumMg,
    servingG, servingLabel,
  } = body

  if (!name || !category || kcalPer100g == null || proteinPer100g == null || carbsPer100g == null || fatPer100g == null) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const food = await prisma.food.create({
    data: {
      name: name.trim(),
      category,
      kcalPer100g: Number(kcalPer100g),
      proteinPer100g: Number(proteinPer100g),
      carbsPer100g: Number(carbsPer100g),
      fatPer100g: Number(fatPer100g),
      fiberPer100g: fiberPer100g != null ? Number(fiberPer100g) : null,
      calciumMg: calciumMg != null ? Number(calciumMg) : null,
      ironMg: ironMg != null ? Number(ironMg) : null,
      potassiumMg: potassiumMg != null ? Number(potassiumMg) : null,
      vitaminCMg: vitaminCMg != null ? Number(vitaminCMg) : null,
      magnesiumMg: magnesiumMg != null ? Number(magnesiumMg) : null,
      servingG: servingG ? Number(servingG) : 100,
      servingLabel: servingLabel?.trim() || null,
      isVerified: false,
      createdBy: session.user.id,
    },
    select: {
      id: true, name: true, category: true,
      kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true,
      fiberPer100g: true, calciumMg: true, ironMg: true,
      potassiumMg: true, vitaminCMg: true, magnesiumMg: true,
      servingG: true, servingLabel: true,
    },
  })

  return NextResponse.json(food, { status: 201 })
}
