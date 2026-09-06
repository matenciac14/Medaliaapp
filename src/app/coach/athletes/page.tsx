import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import AthleteTabs from './_components/AthleteTabs'
import PendingAthletesSection from './_components/PendingAthletesSection'
import { mapRelation } from './_lib/map_athlete'

const TAKE = 20

export default async function CoachAthletesPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    redirect('/dashboard')
  }

  const coachId = session.user.id
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)

  const [coachRelations, totalCount, overduePayments, pendingRelations] = await Promise.all([
    prisma.coachAthlete.findMany({
      where: { coachId },
      take: TAKE + 1,
      orderBy: { createdAt: 'asc' },
      include: {
        athlete: {
          include: {
            profile: true,
            trainingPlans: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: {
                weeks: {
                  orderBy: { weekNumber: 'asc' },
                  include: {
                    sessions: {
                      where: { date: { lte: now } },
                      include: { log: { select: { id: true } } },
                    },
                  },
                },
              },
            },
            checkIns: {
              orderBy: { recordedAt: 'desc' },
              take: 2,
              select: {
                recordedAt: true,
                weightKg: true,
                hrResting: true,
                hardestSessionRpe: true,
                adjustmentsTriggered: true,
                weekNumber: true,
              },
            },
          },
        },
      },
    }),
    prisma.coachAthlete.count({ where: { coachId } }),
    prisma.payment.findMany({ where: { coachId, status: 'PENDING', dueDate: { lt: now } }, select: { athleteId: true } }),
    prisma.coachAthlete.findMany({
      where: { coachId, athlete: { onboardingCompleted: false } },
      orderBy: { createdAt: 'desc' },
      include: { athlete: { select: { id: true, name: true, email: true } } },
    }),
  ])

  const hasMore = coachRelations.length > TAKE
  const page = hasMore ? coachRelations.slice(0, TAKE) : coachRelations
  const nextCursor = hasMore ? page[page.length - 1].id : null
  const athletes = page.map((rel) => mapRelation(rel, now))

  const overdueAthleteIds = [...new Set(overduePayments.map((p) => p.athleteId).filter((id): id is string => id !== null))]
  const alertCount = athletes.filter((a) => a.alertFlags.noCheckin || a.alertFlags.highRpe || a.alertFlags.weightDrop).length

  const pendingAthletes = pendingRelations.map((r) => ({
    athleteId: r.athlete.id,
    name:      r.athlete.name ?? 'Atleta',
    email:     r.athlete.email ?? '',
    addedAt:   r.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-6xl mx-auto px-8 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold" style={{ fontSize: 22, color: '#1e3a5f' }}>
            Mis Atletas
          </h1>
          <p style={{ fontSize: 13, color: '#6b737d' }}>
            {totalCount} asesorados{alertCount > 0 ? ` · ${alertCount} con alertas` : ''}
          </p>
        </div>
        <a
          href="/coach/clients/new"
          className="inline-flex items-center font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ fontSize: 13, backgroundColor: '#ea580c', padding: '10px 18px', borderRadius: 8 }}
        >
          + Nuevo asesorado
        </a>
      </div>

      {athletes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-5xl mb-4">🏃</p>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Aún no tienes asesorados</h2>
          <p className="text-gray-400 text-sm mb-6">Crea tu primer asesorado o comparte tu link de invitación</p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/coach/clients/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              + Crear asesorado
            </a>
            <a
              href="/coach/invite"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Invitar por código
            </a>
          </div>
        </div>
      )}

      <PendingAthletesSection athletes={pendingAthletes} />

      {athletes.length > 0 && (
        <AthleteTabs athletes={athletes} hasMore={hasMore} nextCursor={nextCursor} overdueAthleteIds={overdueAthleteIds} totalCount={totalCount} />
      )}
    </div>
  )
}

