import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import PlanBuilderClient from './_components/PlanBuilderClient'

export default async function PlanBuildPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: athleteId } = await params
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') redirect('/login')

  const coachId = session.user.id

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId } },
  })
  if (!relation) redirect('/coach/athletes')

  const athlete = await prisma.user.findUnique({
    where: { id: athleteId },
    select: { name: true },
  })
  if (!athlete) redirect('/coach/athletes')

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: athleteId, status: 'ACTIVE' },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: { orderBy: { dayOfWeek: 'asc' } },
        },
      },
    },
  })

  const planData = plan
    ? {
        id: plan.id,
        name: plan.name,
        totalWeeks: plan.totalWeeks,
        startDate: plan.startDate.toISOString(),
        weeks: plan.weeks.map((w) => ({
          id: w.id,
          weekNumber: w.weekNumber,
          phase: w.phase as string,
          focusDescription: w.focusDescription,
          isRecoveryWeek: w.isRecoveryWeek,
          startDate: w.startDate.toISOString(),
          endDate: w.endDate.toISOString(),
          sessions: w.sessions.map((s) => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            type: s.type as string,
            durationMin: s.durationMin,
            zoneTarget: s.zoneTarget,
            detailText: s.detailText,
          })),
        })),
      }
    : null

  return (
    <PlanBuilderClient
      athleteId={athleteId}
      athleteName={athlete.name ?? 'Atleta'}
      initialPlan={planData}
    />
  )
}
