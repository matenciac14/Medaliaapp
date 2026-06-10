import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

function jsToOurDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

type DayType = 'hard' | 'easy' | 'rest'

function getDayType(sessionType: string | null, hasGymToday: boolean): DayType {
  if (!sessionType && !hasGymToday) return 'easy'
  if (sessionType === 'DESCANSO') return 'rest'
  if (sessionType && ['FARTLEK', 'TIRADA_LARGA', 'NATACION', 'FUERZA', 'INTERVALOS', 'TEMPO'].includes(sessionType)) return 'hard'
  if (hasGymToday) return 'hard'
  return 'easy'
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = mobile.id
  const todayDow = jsToOurDow(new Date().getDay())
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  const [nutritionPlan, mealPlan, todaySession, gymToday] = await Promise.all([
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.mealPlan.findUnique({ where: { userId } }),
    prisma.plannedSession.findFirst({
      where: {
        week: { plan: { userId, status: 'ACTIVE' } },
        date: { gte: today, lt: tomorrow },
      },
      select: { type: true },
    }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: {
        template: {
          select: {
            days: {
              where: { dayOfWeek: todayDow },
              select: { isRestDay: true },
            },
          },
        },
      },
    }),
  ])

  const hasGymToday = !!(gymToday?.template.days[0] && !gymToday.template.days[0].isRestDay)
  const dayType = getDayType(todaySession?.type ?? null, hasGymToday)

  if (!nutritionPlan) {
    return NextResponse.json({ hasNutritionPlan: false, dayType, macros: null, mealPlan: null })
  }

  const macros = {
    kcal: dayType === 'hard'
      ? nutritionPlan.targetKcalHard
      : dayType === 'rest'
        ? nutritionPlan.targetKcalRest
        : nutritionPlan.targetKcalEasy,
    proteinG: nutritionPlan.proteinG,
    carbsG: dayType === 'hard' ? nutritionPlan.carbsHardG : nutritionPlan.carbsEasyG,
    fatG: nutritionPlan.fatG,
    tdee: nutritionPlan.tdee,
  }

  return NextResponse.json({
    hasNutritionPlan: true,
    dayType,
    macros,
    mealPlan: mealPlan?.data ?? null,
  })
}
