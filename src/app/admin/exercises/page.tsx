import { prisma } from '@/lib/db/prisma'
import { ExercisesClient } from './_components/ExercisesClient'
import SyncButton from './_components/SyncButton'

export default async function AdminExercisesPage() {
  const exercises = await prisma.exercise.findMany({
    where: { coachId: null },
    orderBy: [{ bodyPart: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, bodyPart: true, target: true,
      equipment: true, mechanic: true, description: true,
      gifUrl: true, source: true,
    },
  })

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ejercicios globales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Librería base de Medaliq — disponible para todos los coaches. {exercises.length} ejercicios.
          </p>
        </div>
        <SyncButton />
      </div>
      <ExercisesClient exercises={exercises} />
    </div>
  )
}
