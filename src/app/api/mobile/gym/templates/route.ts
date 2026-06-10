import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const templates = await prisma.workoutTemplate.findMany({
    where: { isPublic: true, isActive: true },
    include: { days: { select: { isRestDay: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(templates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    goal: t.goal,
    level: t.level,
    daysPerWeek: t.daysPerWeek,
    category: t.category,
    trainingDays: t.days.filter(d => !d.isRestDay).length,
  })))
}
