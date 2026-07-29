import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import AthleteNutritionBuilderClient from './_components/AthleteNutritionBuilderClient'

export default async function AthleteNutritionBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const { id } = await params

  // Atletas B2B con coach activo no tienen acceso al builder propio
  const coachRelation = await prisma.coachAthlete.findFirst({
    where: { athleteId: userId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (coachRelation) redirect('/nutrition')

  const [template, nutritionPlan] = await Promise.all([
    prisma.nutritionTemplate.findFirst({
      where: { id, athleteId: userId },
      include: {
        days: {
          orderBy: { dayType: 'asc' },
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
                        servingG: true, servingLabel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.nutritionPlan.findUnique({
      where: { userId },
      select: {
        targetKcalHard: true, targetKcalEasy: true, targetKcalRest: true,
        proteinG: true, carbsHardG: true, carbsEasyG: true, fatG: true,
      },
    }),
  ])

  if (!template) notFound()

  return <AthleteNutritionBuilderClient template={template} nutritionPlan={nutritionPlan} />
}
