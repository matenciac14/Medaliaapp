import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import ExerciseForm from './_components/ExerciseForm'
import { translateBodyPart, translateTarget } from '@/lib/gym-labels'

interface Props {
  searchParams: Promise<{ bodyPart?: string; equipment?: string; adding?: string }>
}

export default async function ExercisesPage({ searchParams }: Props) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id
  const params = await searchParams
  const { bodyPart, equipment, adding } = params

  const exercises = await prisma.exercise.findMany({
    where: {
      AND: [
        { OR: [{ coachId }, { coachId: null }] },
        bodyPart ? { bodyPart: { contains: bodyPart, mode: 'insensitive' } } : {},
        equipment ? { equipment: { contains: equipment, mode: 'insensitive' } } : {},
      ],
    },
    orderBy: [{ bodyPart: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, bodyPart: true, target: true,
      equipment: true, mechanic: true, description: true,
      gifUrl: true, coachId: true, source: true,
    },
  })

  const showForm = adding === '1'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <Link
            href="/coach/gym"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <span>←</span> Volver al gym
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
            Biblioteca de ejercicios
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''} disponibles
          </p>
        </div>
        {!showForm && (
          <Link
            href="/coach/gym/exercises?adding=1"
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#ea580c' }}
          >
            + Agregar ejercicio
          </Link>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mb-6">
          <ExerciseForm />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <FilterForm bodyPart={bodyPart} equipment={equipment} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ejercicio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Parte del cuerpo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Músculo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Equipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {exercises.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No hay ejercicios con esos filtros
                </td>
              </tr>
            ) : (
              exercises.map((ex) => (
                <tr key={ex.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{ex.name}</p>
                    {ex.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ex.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                    {translateBodyPart(ex.bodyPart)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {translateTarget(ex.target)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {ex.equipment}
                  </td>
                  <td className="px-4 py-3">
                    {!ex.coachId ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700">
                        Global
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700">
                        Tuyo
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterForm({ bodyPart, equipment }: { bodyPart?: string; equipment?: string }) {
  return (
    <form method="GET" className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Parte del cuerpo:</label>
        <input
          name="bodyPart"
          defaultValue={bodyPart ?? ''}
          placeholder="ej. upper legs"
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 w-32"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Equipo:</label>
        <input
          name="equipment"
          defaultValue={equipment ?? ''}
          placeholder="ej. barbell"
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 w-28"
        />
      </div>
      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        Filtrar
      </button>
      <a
        href="/coach/gym/exercises"
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
      >
        Limpiar
      </a>
    </form>
  )
}
