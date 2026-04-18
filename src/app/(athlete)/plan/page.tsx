import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import { mockPlan, mockWeeks } from '@/lib/mock/dashboard-data'
import PlanClient, { type PlanClientPlan, type PlanClientWeek } from './_components/PlanClient'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default async function PlanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  let plan: PlanClientPlan = {
    name: mockPlan.name,
    currentWeek: mockPlan.currentWeek,
    totalWeeks: mockPlan.totalWeeks,
    startDate: mockPlan.startDate,
  }

  let weeks: PlanClientWeek[] = mockWeeks.map((w) => ({
    weekNumber: w.weekNumber,
    phase: w.phase,
    volumeKm: w.volumeKm,
    isRecoveryWeek: w.isRecoveryWeek,
    hasTest: w.hasTest,
    focusDescription: w.focusDescription,
    sessions: w.sessions.map((s) => ({
      day: s.day,
      type: s.type,
      label: s.label,
      done: s.done,
    })),
  }))

  try {
    const activePlan = await prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { dayOfWeek: 'asc' },
              include: { log: true },
            },
          },
        },
      },
    })

    if (activePlan) {
      // Calcular semana actual
      const now = new Date()
      const start = new Date(activePlan.startDate)
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const currentWeek = Math.max(1, Math.min(activePlan.totalWeeks, Math.floor(diffDays / 7) + 1))

      plan = {
        name: activePlan.name,
        currentWeek,
        totalWeeks: activePlan.totalWeeks,
        startDate: activePlan.startDate.toISOString().split('T')[0],
      }

      weeks = activePlan.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        phase: w.phase,
        volumeKm: w.volumeKm ?? 0,
        isRecoveryWeek: w.isRecoveryWeek,
        hasTest: w.sessions.some((s) => s.type === 'TEST' || s.type === 'SIMULACRO'),
        focusDescription: w.focusDescription ?? '',
        sessions: w.sessions.map((s) => ({
          day: DAY_LABELS[s.dayOfWeek] ?? String(s.dayOfWeek),
          type: s.type,
          label: s.detailText?.slice(0, 40) ?? s.type,
          done: !!s.log,
        })),
      }))
    }
  } catch {
    // Fallback silencioso — se usan los mock values ya asignados
  }

  return <PlanClient plan={plan} weeks={weeks} />
}
