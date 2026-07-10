import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import CreateTemplateClient from './_components/CreateTemplateClient'

export default async function NutritionBuilderIndexPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  // Atletas B2B usan plantillas del coach — no pueden crear las propias
  const coachRelation = await prisma.coachAthlete.findFirst({
    where: { athleteId: userId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (coachRelation) redirect('/nutrition')

  // Si ya tiene plantillas, ir directo al editor de la primera
  const existing = await prisma.nutritionTemplate.findFirst({
    where: { athleteId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (existing) redirect(`/nutrition/builder/${existing.id}`)

  // Sin plantillas → mostrar pantalla de creación
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <CreateTemplateClient />
    </div>
  )
}
