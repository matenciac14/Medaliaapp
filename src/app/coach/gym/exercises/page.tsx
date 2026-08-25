import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import ExerciseForm from './_components/ExerciseForm'
import { BODY_PART_LABELS, translateBodyPart } from '@/lib/gym-labels'
import ExercisesGrid from './_components/ExercisesGrid'
import { resolveExerciseGifUrl } from '@/lib/gym/gif-url'

interface Props {
  searchParams: Promise<{ bodyPart?: string; q?: string; adding?: string; page?: string }>
}

const PAGE_SIZE = 48

export default async function ExercisesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') redirect('/dashboard')

  const coachId = session.user.id
  const { bodyPart, q, adding, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const conditions: object[] = [{ OR: [{ coachId }, { coachId: null }] }]
  if (bodyPart) conditions.push({ bodyPart: { equals: bodyPart, mode: 'insensitive' as const } })
  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { nameEs: { contains: q, mode: 'insensitive' as const } },
      ],
    })
  }
  const where = { AND: conditions }
  const baseWhere = { AND: [{ OR: [{ coachId }, { coachId: null }] }] }

  const [exercises, total, totalAll, customCount] = await Promise.all([
    prisma.exercise.findMany({
      where,
      orderBy: [{ popularityRank: 'asc' }, { name: 'asc' }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        nameEs: true,
        bodyPart: true,
        target: true,
        equipment: true,
        gifUrl: true,
        gifStoredUrl: true,
        coachId: true,
      },
    }),
    prisma.exercise.count({ where }),
    prisma.exercise.count({ where: baseWhere }),
    prisma.exercise.count({ where: { coachId } }),
  ])

  const bodyPartKeys = Object.keys(BODY_PART_LABELS)
  const showForm = adding === '1'
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function paginationUrl(targetPage: number) {
    const p = new URLSearchParams()
    if (bodyPart) p.set('bodyPart', bodyPart)
    if (q) p.set('q', q)
    if (targetPage > 1) p.set('page', String(targetPage))
    return `/coach/gym/exercises${p.toString() ? `?${p.toString()}` : ''}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Link
              href="/coach/gym"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
            >
              ← Volver al gym
            </Link>
            <h1 className="text-2xl font-black" style={{ color: '#1e3a5f' }}>
              Biblioteca de ejercicios
            </h1>
          </div>
          {!showForm && (
            <Link
              href="/coach/gym/exercises?adding=1"
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
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

        {/* Hero stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-3xl font-black" style={{ color: '#1e3a5f' }}>
              {totalAll.toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wide">
              ejercicios disponibles
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-3xl font-black" style={{ color: '#1e3a5f' }}>
              {bodyPartKeys.length}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wide">
              grupos musculares
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-3xl font-black" style={{ color: '#ea580c' }}>
              {customCount}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wide">
              ejercicios tuyos
            </p>
          </div>
        </div>

        {/* Search bar */}
        <form method="GET" className="mb-4 flex gap-2">
          {bodyPart && <input type="hidden" name="bodyPart" value={bodyPart} />}
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por nombre..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-300"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Buscar
          </button>
          {(q || bodyPart) && (
            <a
              href="/coach/gym/exercises"
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </a>
          )}
        </form>

        {/* Body part chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={q ? `/coach/gym/exercises?q=${encodeURIComponent(q)}` : '/coach/gym/exercises'}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              !bodyPart
                ? 'border-transparent text-white'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
            style={!bodyPart ? { backgroundColor: '#1e3a5f' } : {}}
          >
            Todos
          </Link>
          {bodyPartKeys.map(bp => {
            const active = bodyPart === bp
            const href = `/coach/gym/exercises?bodyPart=${encodeURIComponent(bp)}${q ? `&q=${encodeURIComponent(q)}` : ''}`
            return (
              <Link
                key={bp}
                href={href}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  active
                    ? 'border-transparent text-white'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={active ? { backgroundColor: '#ea580c' } : {}}
              >
                {translateBodyPart(bp)}
              </Link>
            )
          })}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {total.toLocaleString('es-CO')} resultado{total !== 1 ? 's' : ''}
            {bodyPart ? ` · ${translateBodyPart(bodyPart)}` : ''}
            {q ? ` · "${q}"` : ''}
          </p>
          {totalPages > 1 && (
            <p className="text-xs text-gray-400">
              Pág. {page} / {totalPages}
            </p>
          )}
        </div>

        {/* Grid — client component handles click → modal (EX-09) */}
        {exercises.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-semibold text-gray-600">Sin resultados</p>
            <p className="text-sm mt-1">
              Intenta con otro filtro o{' '}
              <a href="/coach/gym/exercises" className="text-orange-500 hover:underline">
                ver todos
              </a>
            </p>
          </div>
        ) : (
          <ExercisesGrid exercises={exercises.map(ex => ({ ...ex, gif: resolveExerciseGifUrl(ex.id, ex.gifStoredUrl, ex.gifUrl) }))} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {page > 1 && (
              <Link
                href={paginationUrl(page - 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            <span className="text-sm text-gray-500 font-medium">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={paginationUrl(page + 1)}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Siguiente →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
