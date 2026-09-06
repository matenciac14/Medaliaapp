import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { loadAthleteData } from '@/infrastructure/db/athlete_loader'
import PlannedMealPlannerClient from './_components/PlannedMealPlannerClient'

function getMondayOf(dateStr: string | null): Date {
  const base = dateStr ? new Date(dateStr) : new Date()
  const dow = base.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  base.setDate(base.getDate() + offset)
  base.setHours(0, 0, 0, 0)
  return base
}

export default async function NutritionPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; templateId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const { week, templateId } = await searchParams
  const weekStart = getMondayOf(week ?? null)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // B2B: redirect — el planner es solo para atleta B2C
  const { coachRelation } = await loadAthleteData(userId, ['coachRelation'])
  if (coachRelation) redirect('/nutrition')

  // Cargar en paralelo — loader handles nutritionPlan + activePlanMeta
  const [{ nutritionPlan, activePlanMeta: activePlan }, plannedMeals] = await Promise.all([
    loadAthleteData(userId, ['nutritionPlan', 'activePlanMeta']),
    prisma.plannedMeal.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
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
    }),
  ])

  // Intensidad por día de la semana para la semana seleccionada
  const weekIntensities: Record<string, string> = {}
  if (activePlan) {
    const weekNumber = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    const sessions = await prisma.plannedSession.findMany({
      where: {
        week: { planId: activePlan.id, weekNumber },
        date: { gte: weekStart, lte: weekEnd },
      },
      select: { date: true, intensity: true },
    })
    for (const s of sessions) {
      if (s.date) weekIntensities[s.date.toISOString().slice(0, 10)] = s.intensity
    }
  }

  // Agrupar meals por fecha
  const mealsByDate: Record<string, typeof plannedMeals> = {}
  for (const m of plannedMeals) {
    const d = m.date.toISOString().slice(0, 10)
    if (!mealsByDate[d]) mealsByDate[d] = []
    mealsByDate[d].push(m)
  }

  return (
    <PlannedMealPlannerClient
      weekStart={weekStart.toISOString().slice(0, 10)}
      initialMeals={mealsByDate}
      weekIntensities={weekIntensities}
      templateId={templateId}
      nutritionPlan={nutritionPlan ? {
        targetKcalHard: nutritionPlan.targetKcalHard,
        targetKcalEasy: nutritionPlan.targetKcalEasy,
        targetKcalRest: nutritionPlan.targetKcalRest,
        proteinG: nutritionPlan.proteinG,
        carbsHardG: nutritionPlan.carbsHardG,
        carbsEasyG: nutritionPlan.carbsEasyG,
        fatG: nutritionPlan.fatG,
      } : null}
    />
  )
}
