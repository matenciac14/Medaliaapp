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
  const hasGym = session.user.features?.gym ?? false

  // Fetch en paralelo: plan activo + check-ins + timezone + sugerencias pendientes + perfil
  const [activePlan, checkIns, userRecord, pendingSuggestions, healthProfile] = await Promise.all([
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
    prisma.checkInSuggestion.findMany({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
      select: { id: true, type: true, title: true, description: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, hrResting: true },
    }),
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
  const hasPlan = session.user.features?.plan ?? false
  const checkInState: CheckInState =
    thisWeekCheckIn        ? 'submitted' :
    isEarlyInWeek && hasPlan ? 'early'   :
    'open'

  // Sesiones de la semana actual
  let weekSessions: WeekSession[] = []
  let weekLabel = activePlan ? '5 minutos para ajustar tu plan' : 'Registra tu semana'
  let weekAdherence = { completed: 0, total: 0 }

  if (activePlan) {
    // BUG-050: si el plan tiene menos semanas en DB que las ya transcurridas,
    // construir weekData sintético con fechas calculadas desde la fecha de inicio del plan
    const foundWeek = activePlan.weeks.find((w) => w.weekNumber === currentWeek)
    const weekData = foundWeek ?? (() => {
      const startMs = new Date(activePlan.startDate).getTime() + (currentWeek - 1) * 7 * 24 * 60 * 60 * 1000
      return {
        weekNumber: currentWeek,
        startDate: new Date(startMs),
        endDate: new Date(startMs + 6 * 24 * 60 * 60 * 1000),
        sessions: [] as typeof activePlan.weeks[0]['sessions'],
      }
    })()

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
    weightKg:          prevCheckIn?.weightKg ?? healthProfile?.weightKg ?? null,
    hrResting:         prevCheckIn?.hrResting ?? healthProfile?.hrResting ?? null,
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
      hasGym={hasGym}
      weekAdherence={weekAdherence}
      checkInState={checkInState}
      submittedAt={thisWeekCheckIn?.recordedAt ?? null}
      submittedTriggers={thisWeekCheckIn?.adjustmentsTriggered ?? []}
      lastWeekSummary={lastWeekSummary}
      initialSuggestions={pendingSuggestions}
    />
  )
}
