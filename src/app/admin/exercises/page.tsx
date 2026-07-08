import { prisma } from '@/lib/db/prisma'
import { ExercisesClient } from './_components/ExercisesClient'

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ejercicios globales</h1>
        <p className="text-sm text-gray-500 mt-1">
          Librería base de Medaliq — disponible para todos los coaches. {exercises.length} ejercicios.
        </p>
      </div>
      <ExercisesClient exercises={exercises} />
    </div>
  )
}
