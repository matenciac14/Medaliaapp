import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const SESSION_COLORS: Record<string, string> = {
  RODAJE_Z2: '#16a34a', FARTLEK: '#f97316', TEMPO: '#dc2626',
  TIRADA_LARGA: '#3b82f6', INTERVALOS: '#ef4444', FUERZA: '#7c3aed',
  DESCANSO: '#9ca3af', TEST: '#6366f1', CICLA: '#d97706', NATACION: '#0891b2',
}

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2', FARTLEK: 'Fartlek', TEMPO: 'Tempo',
  TIRADA_LARGA: 'Tirada larga', INTERVALOS: 'Intervalos', FUERZA: 'Fuerza',
  DESCANSO: 'Descanso', TEST: 'Test', CICLA: 'Ciclismo', NATACION: 'Natación',
}

export default async function PlanViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') redirect('/dashboard')

  const { id: athleteId } = await params
  const coachId = session.user.id

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId } },
    select: { athlete: { select: { name: true } } },
  })
  if (!relation) redirect('/coach/athletes')

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: athleteId, status: 'ACTIVE' },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            orderBy: { dayOfWeek: 'asc' },
            include: { log: { select: { id: true } } },
          },
        },
      },
    },
  })

  const athleteName = relation.athlete.name ?? 'Atleta'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-black text-lg tracking-tight">
            <span style={{ color: '#1e3a5f' }}>Medal</span>
            <span style={{ color: '#f97316' }}>iq</span>
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500">Vista atleta</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm font-semibold text-gray-800">{athleteName}</span>
        </div>
        <Link
          href={`/coach/athlete/${athleteId}/plan/build`}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Volver al builder
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!plan ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <h2 className="text-lg font-semibold text-gray-700">Sin plan activo</h2>
            <p className="text-sm text-gray-400 mt-1">El atleta aún no tiene un plan asignado.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">{plan.name}</h1>
              <p className="text-sm text-gray-400 mt-1">
                {plan.totalWeeks} semanas · Inicio {new Date(plan.startDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="space-y-4">
              {plan.weeks.map((week) => {
                const completed = week.sessions.filter((s) => s.log !== null).length
                const total = week.sessions.length
                return (
                  <div key={week.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">Semana {week.weekNumber}</span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: '#1e3a5f', opacity: 0.8 }}
                        >
                          {week.phase}
                        </span>
                        {week.isRecoveryWeek && (
                          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">Recuperación</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {completed}/{total} completadas
                      </span>
                    </div>

                    {week.focusDescription && (
                      <p className="px-5 py-2 text-xs text-gray-500 border-b border-gray-50 italic">{week.focusDescription}</p>
                    )}

                    <div className="divide-y divide-gray-50">
                      {week.sessions.length === 0 && (
                        <p className="px-5 py-4 text-xs text-gray-400">Sin sesiones esta semana</p>
                      )}
                      {week.sessions.map((session) => {
                        const color = SESSION_COLORS[session.type] ?? '#9ca3af'
                        const label = SESSION_LABELS[session.type] ?? session.type
                        const isCompleted = session.log !== null
                        return (
                          <div key={session.id} className={`flex items-start gap-3 px-5 py-3 ${isCompleted ? 'opacity-60' : ''}`}>
                            <span className="text-xs font-medium text-gray-400 w-8 shrink-0 pt-0.5">
                              {DAY_NAMES[session.dayOfWeek]}
                            </span>
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                                <span className="text-xs text-gray-400">{session.durationMin} min</span>
                                {isCompleted && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">✓ Completada</span>}
                              </div>
                              {session.zoneTarget && (
                                <p className="text-xs text-gray-500 mt-0.5">{session.zoneTarget}</p>
                              )}
                              {session.detailText && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{session.detailText}</p>
                              )}
                              {session.coachNote && (
                                <p className="text-xs text-blue-600 mt-0.5">📝 {session.coachNote}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
