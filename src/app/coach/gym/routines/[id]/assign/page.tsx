import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import AssignForm from './_components/AssignForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AssignRoutinePage({ params }: Props) {
  const session = await auth()

  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id
  const { id } = await params

  const [template, coachRelations] = await Promise.all([
    prisma.workoutTemplate.findFirst({
      where: { id, coachId },
      include: {
        days: {
          orderBy: { order: 'asc' },
          select: { id: true, dayOfWeek: true, label: true, isRestDay: true },
        },
        assignments: {
          where: { isActive: true },
          select: { athleteId: true },
        },
      },
    }),
    prisma.coachAthlete.findMany({
      where: { coachId },
      include: {
        athlete: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  if (!template) notFound()

  const athletes = coachRelations.map((r) => r.athlete)
  const assignedAthleteIds = new Set(template.assignments.map((a) => a.athleteId))

  const GOAL_LABELS: Record<string, string> = {
    HYPERTROPHY: 'Hipertrofia',
    STRENGTH: 'Fuerza',
    TONING: 'Tonificación',
    FUNCTIONAL: 'Funcional',
    ENDURANCE: 'Resistencia',
  }

  const LEVEL_LABELS: Record<string, string> = {
    BEGINNER: 'Principiante',
    INTERMEDIATE: 'Intermedio',
    ADVANCED: 'Avanzado',
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link
        href="/coach/gym"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <span>←</span> Volver al gym
      </Link>

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1e3a5f' }}>
        Asignar rutina
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Asigna esta rutina a uno de tus atletas con una fecha de inicio
      </p>

      {/* Template info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">{template.name}</h2>
        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
          {template.goal && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
              {GOAL_LABELS[template.goal] ?? template.goal}
            </span>
          )}
          {template.level && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">
              {LEVEL_LABELS[template.level] ?? template.level}
            </span>
          )}
          <span className="text-xs text-gray-400 self-center">
            {template.daysPerWeek} días/semana · {template.days.length} días configurados
          </span>
        </div>
        {template.description && (
          <p className="text-sm text-gray-500 mt-3">{template.description}</p>
        )}
      </div>

      {athletes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm mb-3">
            No tienes atletas vinculados. Invita a tus atletas primero.
          </p>
          <Link
            href="/coach/invite"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: '#f97316' }}
          >
            Invitar atleta →
          </Link>
        </div>
      ) : (
        <AssignForm
          templateId={template.id}
          athletes={athletes.map((a) => ({
            id: a.id,
            name: a.name ?? 'Atleta',
            email: a.email ?? '',
            alreadyAssigned: assignedAthleteIds.has(a.id),
          }))}
        />
      )}
    </div>
  )
}
