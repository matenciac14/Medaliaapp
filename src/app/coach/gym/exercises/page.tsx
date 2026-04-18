import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import ExerciseForm from './_components/ExerciseForm'

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  QUADRICEPS: 'Cuádriceps',
  HAMSTRINGS: 'Isquiotibiales',
  GLUTES: 'Glúteos',
  CHEST: 'Pecho',
  BACK: 'Espalda',
  SHOULDERS: 'Hombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  ABS: 'Abdomen',
  CALVES: 'Gemelos',
  FULL_BODY: 'Cuerpo completo',
}

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: 'Barra',
  DUMBBELL: 'Mancuerna',
  MACHINE: 'Máquina',
  CABLE: 'Cable',
  SMITH: 'Smith',
  BODYWEIGHT: 'Peso corporal',
  KETTLEBELL: 'Kettlebell',
  BAND: 'Banda',
  OTHER: 'Otro',
}

const CATEGORY_LABELS: Record<string, string> = {
  COMPOUND: 'Compuesto',
  ISOLATION: 'Aislamiento',
  CARDIO: 'Cardio',
  FUNCTIONAL: 'Funcional',
  STRETCH: 'Estiramiento',
}

interface Props {
  searchParams: Promise<{ muscleGroup?: string; equipment?: string; adding?: string }>
}

export default async function ExercisesPage({ searchParams }: Props) {
  const session = await auth()

  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id
  const params = await searchParams
  const { muscleGroup, equipment, adding } = params

  const exercises = await prisma.exercise.findMany({
    where: {
      AND: [
        { OR: [{ coachId }, { isGlobal: true }] },
        muscleGroup ? { muscleGroups: { has: muscleGroup } } : {},
        equipment ? { equipment: equipment as any } : {},
      ],
    },
    orderBy: [{ isGlobal: 'asc' }, { name: 'asc' }],
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
            style={{ backgroundColor: '#f97316' }}
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
        <FilterForm muscleGroup={muscleGroup} equipment={equipment} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ejercicio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Músculos</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Equipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Categoría</th>
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
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {ex.muscleGroups.slice(0, 2).map((mg) => (
                        <span
                          key={mg}
                          className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium"
                        >
                          {MUSCLE_GROUP_LABELS[mg] ?? mg}
                        </span>
                      ))}
                      {ex.muscleGroups.length > 2 && (
                        <span className="text-xs text-gray-400">+{ex.muscleGroups.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {EQUIPMENT_LABELS[ex.equipment] ?? ex.equipment}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {CATEGORY_LABELS[ex.category] ?? ex.category}
                  </td>
                  <td className="px-4 py-3">
                    {ex.isGlobal ? (
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

// Server-rendered filter form that uses URL params
function FilterForm({
  muscleGroup,
  equipment,
}: {
  muscleGroup?: string
  equipment?: string
}) {
  return (
    <form method="GET" className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Músculo:</label>
        <select
          name="muscleGroup"
          defaultValue={muscleGroup ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Todos</option>
          {Object.entries(MUSCLE_GROUP_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Equipo:</label>
        <select
          name="equipment"
          defaultValue={equipment ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Todos</option>
          {Object.entries(EQUIPMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
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
