import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import { getPlanWeekNumber, getCurrentISOWeek } from '@/lib/core/week-number'
import CheckInClient, { type PrevMetrics, type CheckInState } from './_components/CheckInClient'
import type { WeekSession } from './_components/SessionsPanel'

export default async function CheckinPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const hasNutrition = session.user.features?.nutrition ?? false

  // Fetch en paralelo: plan activo + check-ins + timezone del usuario
  const [activePlan, checkIns, userRecord] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: {
          include: {
            sessions: {
              select: {
                id: true,
                dayOfWeek: true,
                type: true,
                durationMin: true,
                log: { select: { id: true } },
              },
            },
          },
          orderBy: { weekNumber: 'asc' },
        },
      },
    }),
    // Últimos 2 check-ins (esta semana + semana pasada)
    prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 2,
      select: {
        weekNumber: true,
        recordedAt: true,
        adjustmentsTriggered: true,
        weightKg: true,
        hrResting: true,
        sleepHours: true,
        energyLevel: true,
        hardestSessionRpe: true,
        sleepScore: true,
        stressLevel: true,
        motivationLevel: true,
        painLevel: true,
        nutritionAdherencePct: true,
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ])

  const tz = userRecord?.timezone ?? 'America/Bogota'
  const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  const dayOfWeek = nowInTz.getDay() // 0=Dom, 1=Lun … 5=Vie, 6=Sáb
  const isEarlyInWeek = dayOfWeek >= 1 && dayOfWeek <= 4


  const currentWeek = activePlan ? getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks) : getCurrentISOWeek()

  const thisWeekCheckIn = checkIns.find((c) => c.weekNumber === currentWeek) ?? null
  const lastWeekCheckIn = checkIns.find((c) => c.weekNumber === currentWeek - 1) ?? null

  // Estado del check-in:
  // 'submitted' → ya envió esta semana
  // 'early'     → Lun-Jue, aún no envió → mostrar resumen semana pasada + banner
  // 'open'      → Vie-Dom, aún no envió → formulario directo
  const checkInState: CheckInState =
    thisWeekCheckIn ? 'submitted' :
    isEarlyInWeek   ? 'early'     :
    'open'

  // Sesiones de la semana actual
  let weekSessions: WeekSession[] = []
  let weekLabel = '5 minutos para ajustar tu plan'
  let weekAdherence = { completed: 0, total: 0 }

  if (activePlan) {
    const weekData = activePlan.weeks.find((w) => w.weekNumber === currentWeek)
      ?? activePlan.weeks[activePlan.weeks.length - 1]

    if (weekData) {
      weekSessions = weekData.sessions.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        type: s.type as string,
        durationMin: s.durationMin,
        completed: !!s.log,
      }))

      const trainingSessions = weekSessions.filter((s) => s.type !== 'DESCANSO')
      weekAdherence = {
        completed: trainingSessions.filter((s) => s.completed).length,
        total: trainingSessions.length,
      }

      const start = weekData.startDate
      const end = weekData.endDate
      const fmt = (d: Date) =>
        d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
      weekLabel = `Semana ${weekData.weekNumber} · ${fmt(start)} – ${fmt(end)}`
    }
  }

  // Referencia al check-in anterior (para deltas en el form)
  const prevCheckIn = thisWeekCheckIn ?? lastWeekCheckIn

  const prevSleepScore = prevCheckIn?.sleepScore
    ? Math.round(prevCheckIn.sleepScore / 10)
    : null

  const prevNutritionAdherence = prevCheckIn?.nutritionAdherencePct
    ? Math.round(prevCheckIn.nutritionAdherencePct / 10)
    : null

  const prevMetrics: PrevMetrics = {
    weightKg:          prevCheckIn?.weightKg ?? null,
    hrResting:         prevCheckIn?.hrResting ?? null,
    sleepHours:        prevCheckIn?.sleepHours ?? null,
    energyLevel:       prevCheckIn?.energyLevel ?? null,
    hardestSessionRpe: prevCheckIn?.hardestSessionRpe ?? null,
    prevSleepScore,
    stressLevel:       prevCheckIn?.stressLevel ?? null,
    motivationLevel:   prevCheckIn?.motivationLevel ?? null,
    painLevel:         prevCheckIn?.painLevel ?? null,
    prevNutritionAdherence,
  }

  // Datos semana pasada para la pantalla 'early'
  const lastWeekSummary = lastWeekCheckIn
    ? {
        weightKg:          lastWeekCheckIn.weightKg,
        sleepHours:        lastWeekCheckIn.sleepHours,
        energyLevel:       lastWeekCheckIn.energyLevel,
        stressLevel:       lastWeekCheckIn.stressLevel,
        motivationLevel:   lastWeekCheckIn.motivationLevel,
        adjustmentsTriggered: lastWeekCheckIn.adjustmentsTriggered,
        recordedAt:        lastWeekCheckIn.recordedAt,
      }
    : null

  return (
    <CheckInClient
      weekSessions={weekSessions}
      prevMetrics={prevMetrics}
      weekLabel={weekLabel}
      hasNutrition={hasNutrition}
      weekAdherence={weekAdherence}
      checkInState={checkInState}
      submittedAt={thisWeekCheckIn?.recordedAt ?? null}
      submittedTriggers={thisWeekCheckIn?.adjustmentsTriggered ?? []}
      lastWeekSummary={lastWeekSummary}
    />
  )
}
