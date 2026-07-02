import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import NutritionTemplatesClient from './_components/NutritionTemplatesClient'

export default async function CoachNutritionPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') redirect('/login')

  const templates = await prisma.nutritionTemplate.findMany({
    where: { coachId: session.user.id },
    include: {
      days: {
        include: {
          meals: { include: { items: { include: { food: { select: { name: true } } } } } },
        },
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calcular totales por día para preview
  const enriched = templates.map((t) => {
    const dayTotals = Object.fromEntries(
      t.days.map((d) => {
        const totals = d.meals.reduce(
          (acc, m) => {
            for (const item of m.items) {
              acc.kcal     += item.kcal
              acc.proteinG += item.proteinG
              acc.carbsG   += item.carbsG
              acc.fatG     += item.fatG
            }
            return acc
          },
          { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
        )
        return [d.dayType, totals]
      })
    )
    return { ...t, dayTotals }
  })

  return <NutritionTemplatesClient templates={enriched} />
}
