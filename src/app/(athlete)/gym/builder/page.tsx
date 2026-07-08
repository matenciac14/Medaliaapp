import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import GymRoutineBuilder from './_components/GymRoutineBuilder'

export default async function GymBuilderPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [exercises, coachRelation] = await Promise.all([
    prisma.exercise.findMany({
      where: { coachId: null },
      select: { id: true, name: true, bodyPart: true, target: true, equipment: true },
      orderBy: { name: 'asc' },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId: session.user.id, status: 'ACTIVE' },
      select: { id: true },
    }),
  ])

  if (coachRelation) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-5xl">🏋️</p>
        <h2 className="text-xl font-bold text-[#1e3a5f]">Tu coach gestiona tu rutina</h2>
        <p className="text-sm text-gray-500">Con un entrenador activo, las rutinas las asigna tu coach. Pídele que te arme una personalizada.</p>
        <a href="/gym" className="inline-block mt-2 text-sm font-semibold text-[#ea580c] hover:underline">Volver a ejercicios</a>
      </div>
    )
  }

  return <GymRoutineBuilder exercises={exercises} />
}
