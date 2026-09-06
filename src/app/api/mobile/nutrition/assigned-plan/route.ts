import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { prisma } from '@/lib/db/prisma'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily_target'
import type { SessionIntensity } from '@/generated/prisma/client'

// GET /api/mobile/nutrition/assigned-plan
// Devuelve el plan nutricional asignado por el coach al atleta,
// con las comidas del día correspondiente al tipo de día (HARD/EASY/REST)
// según la sesión planificada para hoy.
export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const assignment = await prisma.assignedNutritionPlan.findUnique({
    where: { athleteId: mobile.id },
    include: {
      template: {
        include: {
          days: {
            include: {
              meals: {
                orderBy: { order: 'asc' },
                include: {
                  items: {
                    orderBy: { order: 'asc' },
                    include: {
                      food: {
                        select: {
                          id: true, name: true, category: true,
                          kcalPer100g: true, proteinPer100g: true,
                          carbsPer100g: true, fatPer100g: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!assignment) {
    return NextResponse.json({ assignedPlan: null })
  }

  // Determinar el tipo de día según la sesión de hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todaySession = await prisma.plannedSession.findFirst({
    where: {
      date: { gte: today, lt: tomorrow },
      week: { plan: { userId: mobile.id, status: 'ACTIVE' } },
    },
    select: { intensity: true },
  })

  // Mapear intensidad → dayType
  const intensityToDayType = (intensity?: SessionIntensity | null): 'HARD' | 'EASY' | 'REST' => {
    if (!intensity || intensity === 'REST') return 'REST'
    if (intensity === 'HIGH') return 'HARD'
    return 'EASY'
  }

  const dayType = intensityToDayType(todaySession?.intensity)
  const dayData = assignment.template.days.find((d) => d.dayType === dayType)

  // Totales del día
  const totals = dayData?.meals.reduce(
    (acc, meal) => {
      for (const item of meal.items) {
        acc.kcal     += item.kcal
        acc.proteinG += item.proteinG
        acc.carbsG   += item.carbsG
        acc.fatG     += item.fatG
      }
      return acc
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  ) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }

  // Targets del plan nutricional automático (para comparación / fallback)
  const nutritionPlan = await prisma.nutritionPlan.findUnique({ where: { userId: mobile.id } })
  const targets = nutritionPlan
    ? getDailyNutritionTarget(todaySession?.intensity ?? 'REST', nutritionPlan)
    : null

  return NextResponse.json({
    assignedPlan: {
      templateId: assignment.templateId,
      templateName: assignment.template.name,
      assignedAt: assignment.assignedAt,
      dayType,
      day: dayData ?? null,
      totals,
      targets,
    },
  })
}
