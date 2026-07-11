import Link from 'next/link'
import { CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { PlanStatus } from '@/generated/prisma/enums'
import { redirect } from 'next/navigation'
import InstallPWABanner from '@/app/_components/InstallPWABanner'
import QuickLog from '../_components/QuickLog'
import WeekNavBar from '../_components/WeekNavBar'
import DashboardCalendarStrip from '../_components/DashboardCalendarStrip'
import CoachCard from '../_components/CoachCard'
import WeeklySummaryCard from '../_components/WeeklySummaryCard'
import DailySessionCard from '../_components/DailySessionCard'
import FreeDashboard from '../_components/FreeDashboard'
import PlanCompletionCard from '../_components/PlanCompletionCard'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import { jsToOurDow } from '@/lib/core/date-utils'
import { selectActivePlan } from '@/lib/plan/active-plan'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { getDashboardSummary } from '@/domain/dashboard/get-dashboard-summary.use-case'
import StreakShareButton from '../_components/StreakShareButton'

const PHASE_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  DESARROLLO: 'bg-yellow-100 text-yellow-800',
  ESPECIFICO: 'bg-orange-100 text-orange-800',
  AFINAMIENTO: 'bg-green-100 text-green-800',
}

function phaseLabel(phase: string) {
  if (phase === 'ESPECIFICO') return 'ESPECÍFICO'
  return phase
}

function buildWeeklySummary({
  completedCount, totalTraining, currentVolume, volumeDeltaPct,
  streakDays, formStatus, last4WeeksAdherencePct, planPhase, isCurrentWeek,
}: {
  completedCount: number
  totalTraining: number
  currentVolume: number | null
  volumeDeltaPct: number | null
  streakDays: number
  formStatus: 'good' | 'moderate' | 'rest'
  last4WeeksAdherencePct: number | null
  planPhase: string
  isCurrentWeek: boolean
}): string | null {
  if (!isCurrentWeek || totalTraining === 0) return null

  const lines: string[] = []

  if (completedCount === totalTraining && totalTraining > 1) {
    lines.push(`Completaste las ${totalTraining} sesiones de la semana. ¡Semana perfecta!`)
  } else if (completedCount === 0) {
    lines.push(`Aún no has completado sesiones esta semana.`)
  } else {
    lines.push(`Llevas ${completedCount} de ${totalTraining} sesiones completadas.`)
  }

  if (currentVolume && currentVolume > 0) {
    if (volumeDeltaPct !== null && volumeDeltaPct > 10) {
      lines.push(`Volumen: ${currentVolume} km — ${volumeDeltaPct}% más que la semana pasada.`)
    } else if (volumeDeltaPct !== null && volumeDeltaPct < -10) {
      lines.push(`Semana de recuperación: ${currentVolume} km planificados.`)
    } else {
      lines.push(`Volumen planificado: ${currentVolume} km.`)
    }
  } else if (last4WeeksAdherencePct !== null && last4WeeksAdherencePct < 60) {
    lines.push(`Adherencia últimas 4 semanas: ${last4WeeksAdherencePct}%. La consistencia es la clave.`)
  }

  if (planPhase === 'AFINAMIENTO') {
    lines.push(`Fase de afinamiento: intensidad controlada, prioriza el descanso.`)
  } else if (formStatus === 'rest') {
    lines.push(`Tus métricas sugieren priorizar recuperación antes del próximo esfuerzo.`)
  } else if (streakDays >= 4) {
    lines.push(`${streakDays} días seguidos entrenando. Sigue así.`)
  }

  return lines.slice(0, 2).join(' ') || null
}

function buildFreeModeSummary({
  weekSessionCount, weekSessionTarget, todayRoutineDay, dashboardMode, recoveryDaysSinceEnd,
}: {
  weekSessionCount: number
  weekSessionTarget: number
  todayRoutineDay: { activity: 'GYM' | 'RUN' | 'REST' } | null
  dashboardMode: 'FREE' | 'RECOVERY'
  recoveryDaysSinceEnd: number | null
}): string | null {
  const lines: string[] = []

  if (weekSessionCount === 0) {
    lines.push('Aún no has entrenado esta semana.')
  } else if (weekSessionCount >= weekSessionTarget) {
    lines.push(`${weekSessionCount} sesiones esta semana — meta cumplida.`)
  } else {
    lines.push(`${weekSessionCount} de ${weekSessionTarget} sesiones esta semana.`)
  }

  if (dashboardMode === 'RECOVERY' && recoveryDaysSinceEnd !== null && recoveryDaysSinceEnd <= 7) {
    lines.push('Semana de recuperación — mantén la intensidad baja.')
  } else if (todayRoutineDay && todayRoutineDay.activity !== 'REST') {
    const label = todayRoutineDay.activity === 'GYM' ? 'Ejercicios' : 'Salida a correr'
    lines.push(`Hoy: ${label}.`)
  }

  return lines.join(' ') || null
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  const s = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}


export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ weekOffset?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id
  const { weekOffset: weekOffsetParam } = await searchParams
  const rawWeekOffset = parseInt(weekOffsetParam ?? '0') || 0

  // ── Fetch completo ─────────────────────────────────────────────────────────
  const [dbUser, activePlansRaw, coachRelationRaw, assignedWorkoutRaw, nutritionPlan, recentLogs, weeklyRoutine, recentGymSessions, pendingSuggestionsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        checkIns: { orderBy: { recordedAt: 'desc' }, take: 10 },
      },
    }),
    prisma.trainingPlan.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          // PERF-01: solo metadata de semanas + id/type/log por sesión
          // Los campos completos de sesión (dayOfWeek, durationMin, etc.) se cargan
          // por separado para la semana actual únicamente
          include: {
            sessions: {
              select: { id: true, type: true, log: { select: { id: true } } },
            },
          },
        },
      },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId: userId },
      include: { coach: { select: { name: true, coachProfile: { select: { slug: true, specialties: true, headline: true } } } } },
    }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      include: { template: { include: { days: { include: { exercises: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
    prisma.sessionLog.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 60,
      select: { id: true, completedAt: true, freeSessionType: true, durationMin: true },
    }),
    prisma.weeklyRoutine.findUnique({ where: { userId } }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true },
      orderBy: { date: 'desc' },
      take: 60,
      select: { date: true },
    }),
    prisma.checkInSuggestion.count({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
    }),
  ])

  if (!dbUser) redirect('/login')

  // ── Seleccionar el plan ACTIVE correcto cuando hay duplicados ─────────────
  const { winner: _activePlanWinner, loserIds: _dashboardLoserIds } = selectActivePlan(activePlansRaw)
  let activePlanRaw = _activePlanWinner
  if (_dashboardLoserIds.length > 0) {
    prisma.trainingPlan.updateMany({
      where: { id: { in: _dashboardLoserIds } },
      data: { status: PlanStatus.COMPLETED },
    }).catch(() => {})
  }

  // ── Lifecycle: detectar plan expirado → RECOVERY / FREE ───────────────────
  type DashboardMode = 'TRAINING' | 'RECOVERY' | 'FREE' | 'GYM'
  type CompletedPlanInfo = { endDate: Date; name: string; totalWeeks: number; sessionsLogged: number; sessionsTotal: number }
  let lastCompletedPlanInfo: CompletedPlanInfo | null = null

  if (activePlanRaw) {
    const now = new Date()
    const rawWeek = Math.floor((now.getTime() - new Date(activePlanRaw.startDate).getTime()) / 86400000 / 7) + 1
    if (rawWeek > activePlanRaw.totalWeeks && now > new Date(activePlanRaw.endDate)) {
      prisma.trainingPlan.update({
        where: { id: activePlanRaw.id },
        data: { status: PlanStatus.COMPLETED },
      }).catch(() => {})
      const allSessions = activePlanRaw.weeks.flatMap(w => w.sessions)
      lastCompletedPlanInfo = {
        endDate: new Date(activePlanRaw.endDate),
        name: activePlanRaw.name,
        totalWeeks: activePlanRaw.totalWeeks,
        sessionsLogged: allSessions.filter(s => s.log).length,
        sessionsTotal: allSessions.length,
      }
      activePlanRaw = null
    }
  }

  const activePlan = activePlanRaw ?? null

  // Si no hay plan activo (o recién expiró), buscar el último COMPLETED en DB
  if (!activePlan && !lastCompletedPlanInfo) {
    const raw = await prisma.trainingPlan.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      select: {
        endDate: true, name: true, totalWeeks: true,
        weeks: { select: { sessions: { select: { log: { select: { id: true } } } } } },
      },
    })
    if (raw) {
      const allSessions = raw.weeks.flatMap(w => w.sessions)
      lastCompletedPlanInfo = {
        endDate: new Date(raw.endDate),
        name: raw.name,
        totalWeeks: raw.totalWeeks,
        sessionsLogged: allSessions.filter(s => s.log).length,
        sessionsTotal: allSessions.length,
      }
    }
  }

  const recoveryDaysSinceEnd = lastCompletedPlanInfo
    ? Math.floor((Date.now() - lastCompletedPlanInfo.endDate.getTime()) / 86400000)
    : null
  const dashboardMode: DashboardMode = activePlan
    ? 'TRAINING'
    : assignedWorkoutRaw
      ? 'GYM'
      : lastCompletedPlanInfo && recoveryDaysSinceEnd !== null && recoveryDaysSinceEnd <= 14
        ? 'RECOVERY'
        : 'FREE'

  const firstName = (dbUser.name ?? dbUser.email ?? 'Atleta').split(' ')[0]

  const profile = dbUser.profile
  const lastCheckIn = dbUser.checkIns[0] ?? null
  const coachRelation = coachRelationRaw ?? null
  const assignedWorkout = assignedWorkoutRaw ?? null
  const todayDow = jsToOurDow(new Date().getDay())
  const todayGymDay = assignedWorkout?.template.days.find((d) => d.dayOfWeek === todayDow) ?? null
  const hasGymToday = !!(todayGymDay && !todayGymDay.isRestDay)

  // ── Self-directed: today's routine day + weekly session count ─────────────
  type RoutineDayConfig = { dow: number; activity: 'GYM' | 'RUN' | 'REST'; split?: string; runType?: string }
  const routineDays = (weeklyRoutine?.days ?? []) as RoutineDayConfig[]
  const todayRoutineDay = routineDays.find((d) => d.dow === todayDow) ?? null

  // Count distinct days with any activity this week (Mon=start)
  const weekStart = (() => {
    const today = new Date()
    const dow = today.getDay() === 0 ? 7 : today.getDay()
    const monday = new Date(today)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(today.getDate() - (dow - 1))
    return monday
  })()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const [weekFreeLogs, weekGymSessions] = activePlan ? [[], []] : await Promise.all([
    prisma.sessionLog.findMany({
      where: { userId, plannedSessionId: null, completedAt: { gte: weekStart, lte: weekEnd } },
      select: { completedAt: true, freeSessionType: true },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true, date: { gte: weekStart, lte: weekEnd } },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        assignedWorkout: { select: { template: { select: { name: true } } } },
      },
    }),
  ])
  const activeDaysThisWeek = new Set([
    ...weekFreeLogs.map((l) => new Date(l.completedAt).toDateString()),
    ...weekGymSessions.map((g) => new Date(g.date).toDateString()),
  ])
  const weekSessionCount = activeDaysThisWeek.size

  // Build activity list for FREE/RECOVERY mode
  type WeekActivity = { dateStr: string; label: string; emoji: string }
  const weekActivities: WeekActivity[] = [
    ...weekFreeLogs.map(l => ({
      dateStr: new Date(l.completedAt).toLocaleDateString('es-CO', { weekday: 'short' }),
      label: l.freeSessionType ?? 'Sesión libre',
      emoji: '🏃',
    })),
    ...weekGymSessions.map(g => ({
      dateStr: new Date(g.date).toLocaleDateString('es-CO', { weekday: 'short' }),
      label: g.assignedWorkout?.template.name ?? 'Ejercicios',
      emoji: '💪',
    })),
  ].sort((a, b) => a.dateStr.localeCompare(b.dateStr))
  const weekSessionTarget = weeklyRoutine?.daysPerWeek ?? 4

  // ── Plan y semana actual ───────────────────────────────────────────────────
  let planData = { name: 'Sin plan', totalWeeks: 0, currentWeek: 0, phase: 'BASE' }
  let todaySession: { id: string; type: string; intensity: string; durationMin: number; zoneTarget: string; detailText: string; completed: boolean } | null = null
  let currentWeekVolumeKm: number | null = null
  let weekOffset = 0
  let selectedWeekNum = 0
  let isCurrentWeek = true

  if (activePlan) {
    const currentWeek = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)

    weekOffset = Math.max(1 - currentWeek, rawWeekOffset)
    selectedWeekNum = currentWeek + weekOffset
    isCurrentWeek = weekOffset === 0

    const currentPlanWeek = activePlan.weeks.find(w => w.weekNumber === currentWeek) ?? null
    const selectedPlanWeek = activePlan.weeks.find(w => w.weekNumber === selectedWeekNum) ?? null

    planData = {
      name: activePlan.name,
      totalWeeks: activePlan.totalWeeks,
      currentWeek,
      phase: currentPlanWeek?.phase ?? 'BASE',
    }

    // PERF-01: cargar sesiones completas solo para la semana actual (dayOfWeek, durationMin, etc.)
    if (currentPlanWeek) {
      const currentWeekFullSessions = await prisma.plannedSession.findMany({
        where: { week: { planId: activePlan.id, weekNumber: currentWeek } },
        include: { log: true },
        orderBy: { dayOfWeek: 'asc' },
      })
      const todayPlanned = currentWeekFullSessions.find(s => s.dayOfWeek === todayDow) ?? null
      if (todayPlanned && todayPlanned.type !== 'DESCANSO') {
        todaySession = {
          id: todayPlanned.id,
          type: todayPlanned.type,
          intensity: todayPlanned.intensity ?? 'MODERATE',
          durationMin: todayPlanned.durationMin,
          zoneTarget: todayPlanned.zoneTarget ?? 'Z2',
          detailText: todayPlanned.detailText ?? '',
          completed: !!todayPlanned.log,
        }
      }
    }

    currentWeekVolumeKm = selectedPlanWeek?.volumeKm ?? null
  }

  // BUG-056: si el plan dice "Descanso" o no hay sesión planificada hoy pero el atleta
  // registró una sesión libre, mostrarla en DailySessionCard en lugar de "Descanso hoy"
  if (!todaySession) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayFreeLog = recentLogs.find(l => new Date(l.completedAt) >= todayStart)
    if (todayFreeLog) {
      todaySession = {
        id: todayFreeLog.id,
        type: todayFreeLog.freeSessionType ?? 'OTRO',
        intensity: 'MODERATE',
        durationMin: todayFreeLog.durationMin ?? 0,
        zoneTarget: 'LIBRE',
        detailText: 'Sesión libre registrada',
        completed: true,
      }
    }
  }

  // ── getDashboardSummary — eliminates duplicated computation ─────────────
  // streakDays, raceDays, isRecomp, formStatus/formMessage, weight progress,
  // weeklyWeightChange, checkinPending, nutritionTarget, volumeDelta
  // Note: todaySession + weekSessions from use case are NOT used — web computes
  // them separately (BUG-056 fallback + week navigation require web-specific logic)
  const { summary: dashSummary } = getDashboardSummary({
    user: {
      name: dbUser.name,
      profile: profile ? {
        weightKg: profile.weightKg,
        hrResting: profile.hrResting,
        weightGoalKg: profile.weightGoalKg,
        sleepHoursAvg: profile.sleepHoursAvg,
        sportDetails: profile.sportDetails,
        sportGoal: profile.sportGoal,
      } : null,
    },
    activePlanRaw: activePlan ? {
      id: activePlan.id,
      name: activePlan.name,
      startDate: new Date(activePlan.startDate),
      totalWeeks: activePlan.totalWeeks,
      weeks: activePlan.weeks.map(w => ({
        weekNumber: w.weekNumber,
        phase: w.phase,
        volumeKm: w.volumeKm ?? null,
        // dayOfWeek stubs — use case todaySession/weekSessions outputs are unused
        sessions: w.sessions.map(s => ({
          id: s.id, type: s.type, dayOfWeek: 0, durationMin: null,
          zone: null, intensity: null, description: null, log: s.log,
        })),
      })),
    } : null,
    lastCompletedPlan: lastCompletedPlanInfo
      ? { name: lastCompletedPlanInfo.name, endDate: lastCompletedPlanInfo.endDate }
      : null,
    checkIns: dbUser.checkIns.map(c => ({
      recordedAt: c.recordedAt,
      weekNumber: c.weekNumber,
      weightKg: c.weightKg,
      hrResting: c.hrResting,
      sleepHours: c.sleepHours,
      energyLevel: c.energyLevel,
      hardestSessionRpe: c.hardestSessionRpe,
    })),
    recentLogs: recentLogs.map(l => ({
      completedAt: l.completedAt,
      freeSessionType: l.freeSessionType ?? null,
      durationMin: l.durationMin ?? null,
    })),
    nutritionPlan: nutritionPlan ? {
      targetKcalHard: nutritionPlan.targetKcalHard,
      targetKcalEasy: nutritionPlan.targetKcalEasy,
      targetKcalRest: nutritionPlan.targetKcalRest,
      proteinG: nutritionPlan.proteinG,
      carbsHardG: nutritionPlan.carbsHardG,
      carbsEasyG: nutritionPlan.carbsEasyG,
      fatG: nutritionPlan.fatG,
    } : null,
    assignedWorkout: assignedWorkout ? {
      template: {
        days: assignedWorkout.template.days.map(d => ({
          dayOfWeek: d.dayOfWeek,
          isRestDay: d.isRestDay,
        })),
      },
    } : null,
    gymCompletionDates: recentGymSessions.map(gs => gs.date),
  })

  const streakDays = dashSummary.streakDays
  const raceDays = dashSummary.raceDays
  const isRecomp = dashSummary.isRecomp
  const weeklyWeightChange = dashSummary.weeklyWeightChange
  const weightProgressPct = dashSummary.weightProgressPct
  const formStatus = dashSummary.formStatus
  const formMessage = dashSummary.formMessage
  const checkinPending = dashSummary.checkinPending
  const currentWeight = dashSummary.metrics.weightKg
  const targetWeight = dashSummary.metrics.weightGoalKg
  const formCheckInDate: string | null = lastCheckIn
    ? (() => {
        const daysAgo = Math.floor((Date.now() - new Date(lastCheckIn.recordedAt).getTime()) / 86400000)
        return daysAgo === 0 ? 'hoy' : daysAgo === 1 ? 'ayer' : `hace ${daysAgo} días`
      })()
    : null

  // ── Rango de fechas de la semana actual ────────────────────────────────────
  // Usamos el lunes calendario real de la semana de hoy (igual que PlanClient.getWeekMonday).
  // NO usamos startDate del plan + offset: eso daría el límite interno del plan, no el lunes real.
  const weekStartDate = (() => {
    const today = new Date()
    const dow = today.getDay() === 0 ? 7 : today.getDay() // 1=Lun…7=Dom
    const monday = new Date(today)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(today.getDate() - (dow - 1) + weekOffset * 7)
    return monday
  })()
  const weekDateLabel = (() => {
    const end = new Date(weekStartDate)
    end.setDate(end.getDate() + 6)
    const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    const startStr = `${weekStartDate.getDate()} ${MONTHS[weekStartDate.getMonth()]}`
    const endStr = weekStartDate.getMonth() === end.getMonth()
      ? `${end.getDate()} ${MONTHS[end.getMonth()]}`
      : `${end.getDate()} ${MONTHS[end.getMonth()]}`
    const rangeStr = weekStartDate.getMonth() === end.getMonth()
      ? `${weekStartDate.getDate()}–${end.getDate()} ${MONTHS[weekStartDate.getMonth()]}`
      : `${startStr} – ${endStr}`
    return activePlan ? `Sem. ${selectedWeekNum || planData.currentWeek} · ${rangeStr}` : rangeStr
  })()
  // ── KPIs de la semana ─────────────────────────────────────────────────────
  const selectedPlanWeekSessions = activePlan?.weeks.find(w => w.weekNumber === selectedWeekNum)?.sessions ?? []
  const planCompletedCount = selectedPlanWeekSessions.filter(s => s.log && s.type !== 'DESCANSO').length
  const planTotalTraining  = selectedPlanWeekSessions.filter(s => s.type !== 'DESCANSO').length
  // BUG-057: sumar sesiones libres del atleta para la semana seleccionada
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekStartDate.getDate() + 7)
  const freeLogsSelectedWeek = recentLogs.filter(l =>
    l.freeSessionType !== null &&
    new Date(l.completedAt) >= weekStartDate &&
    new Date(l.completedAt) < weekEndDate
  ).length
  const completedCount = planCompletedCount + freeLogsSelectedWeek
  const totalTraining  = planTotalTraining  + freeLogsSelectedWeek

  const phaseDisplay = phaseLabel(planData.phase)

  // ── Hero card 1: Tu Carrera / Tu Objetivo ─────────────────────────────────
  const raceDate = (profile?.sportDetails as Record<string, unknown> | null)?.raceDate as string | undefined

  // ── Carga semanal (volumen planificado) ─────────────────────────────────────
  const currentVolume = currentWeekVolumeKm
  const prevPlanWeekData = activePlan?.weeks.find((w: { weekNumber: number }) => w.weekNumber === planData.currentWeek - 1)
  const prevVolume = prevPlanWeekData?.volumeKm ?? null
  const volumeDeltaPct = currentVolume && prevVolume
    ? Math.round(((currentVolume - prevVolume) / prevVolume) * 100)
    : null

  // ── Adherencia últimas 4 semanas ──────────────────────────────────────────
  let last4WeeksAdherencePct: number | null = null
  if (activePlan && activePlan.weeks.length > 0) {
    const currentWeekIdx = activePlan.weeks.findIndex(w => w.weekNumber === planData.currentWeek)
    const from = Math.max(0, currentWeekIdx - 3)
    const last4 = activePlan.weeks.slice(from, currentWeekIdx + 1)
    const allSessions = last4.flatMap(w => w.sessions).filter(s => s.type !== 'DESCANSO')
    if (allSessions.length > 0) {
      last4WeeksAdherencePct = Math.round((allSessions.filter(s => s.log).length / allSessions.length) * 100)
    }
  }

  // ── Resumen semanal determinista ────────────────────────────────────────────
  const weeklySummary = dashboardMode === 'TRAINING' ? buildWeeklySummary({
    completedCount, totalTraining, currentVolume, volumeDeltaPct,
    streakDays, formStatus, last4WeeksAdherencePct, planPhase: planData.phase, isCurrentWeek,
  }) : null
  const freeModeSummary = (dashboardMode === 'FREE' || dashboardMode === 'RECOVERY')
    ? buildFreeModeSummary({ weekSessionCount, weekSessionTarget, todayRoutineDay, dashboardMode: dashboardMode as 'FREE' | 'RECOVERY', recoveryDaysSinceEnd })
    : null
  const gymModeSummary: string | null = dashboardMode === 'GYM'
    ? weekSessionCount === 0
      ? `Rutina activa: ${assignedWorkout?.template.name ?? 'Fuerza'}. ¡A entrenar!`
      : `${weekSessionCount} de ${weekSessionTarget} sesiones esta semana. Sigue así.`
    : null

  return (
    <div className="py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto space-y-6">

      {/* PWA install banner — solo mobile, solo si no está instalada */}
      <div className="lg:hidden">
        <InstallPWABanner />
      </div>

      <div className="px-4 lg:px-0 space-y-6">
      {/* Banner sugerencias pendientes del check-in */}
      {pendingSuggestionsCount > 0 && (
        <Link href="/checkin" className="block rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 hover:bg-blue-100 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {pendingSuggestionsCount === 1
                    ? '1 sugerencia de ajuste pendiente'
                    : `${pendingSuggestionsCount} sugerencias de ajuste pendientes`}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">Tu coach propone cambios en tu plan basados en el check-in</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-blue-400 shrink-0" />
          </div>
        </Link>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {getGreeting()}, {firstName} 👋
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-gray-500">{formatDate()}</p>
          {streakDays >= 2 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200/60 text-[11px] font-semibold text-[#ea580c]">
              🔥 {streakDays} días · racha activa
            </span>
          )}
          <StreakShareButton streakDays={streakDays} />
          {last4WeeksAdherencePct !== null && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border
              ${last4WeeksAdherencePct >= 70
                ? 'bg-green-50 border-green-200/60 text-green-700'
                : last4WeeksAdherencePct >= 40
                  ? 'bg-amber-50 border-amber-200/60 text-amber-700'
                  : 'bg-red-50 border-red-200/60 text-red-700'}`}>
              {last4WeeksAdherencePct}% adherencia
            </span>
          )}
        </div>
      </div>

      {/* Hero cards — 3 stats enfocados en el atleta (ocultar para nuevo usuario sin historial de plan) */}
      {!(dashboardMode === 'FREE' && !lastCompletedPlanInfo) && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Card 1: Tu Rutina (GYM) · Tu Objetivo (recomp) · Tu Carrera (running) */}
        {dashboardMode === 'GYM' ? (
          /* GYM: rutina asignada activa */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex h-full">
              <div className="w-1 bg-[#ea580c] shrink-0" />
              <div className="flex-1 px-4 py-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">💪 Tu Rutina</p>
                <p className="text-base font-bold text-[#1e3a5f] leading-tight mb-1">
                  {assignedWorkout?.template.name ?? 'Rutina activa'}
                </p>
                <p className="text-[11px] text-gray-500 mb-3">
                  {weekSessionCount} de {weekSessionTarget} días esta semana
                </p>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: weekSessionTarget }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${i < weekSessionCount ? 'bg-[#ea580c]' : 'bg-gray-100'}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-gray-400">
                    {weekSessionCount >= weekSessionTarget ? 'Meta semanal cumplida' : `Faltan ${weekSessionTarget - weekSessionCount}`}
                  </p>
                  <Link href="/gym" className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">Ver rutina →</Link>
                </div>
              </div>
            </div>
          </div>
        ) : isRecomp ? (
          /* Recomposición corporal */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex h-full">
              <div className="w-1 bg-[#22c55e] shrink-0" />
              <div className="flex-1 px-4 py-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">🎯 Tu Objetivo</p>
                {currentWeight && targetWeight ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-black text-[#1e3a5f] leading-none">
                        ~{weeklyWeightChange
                          ? Math.max(0, Math.ceil(Math.abs((currentWeight - targetWeight) / (weeklyWeightChange || 0.5)) * 7))
                          : '—'}
                      </span>
                      <span className="text-sm text-gray-400">días</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      para llegar a {targetWeight} kg
                      {weeklyWeightChange ? ` · ${weeklyWeightChange > 0 ? '+' : ''}${weeklyWeightChange.toFixed(1)} kg/sem` : ''}
                    </p>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-[#22c55e] rounded-full" style={{ width: `${weightProgressPct ?? 0}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-gray-400">{weightProgressPct ?? 0}% completado</p>
                      <Link href="/progress" className="text-[10px] font-semibold text-[#22c55e]">Ver progreso →</Link>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Define tu meta de peso</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Atleta de carrera */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex h-full">
              <div className="w-1 bg-[#ea580c] shrink-0" />
              <div className="flex-1 px-4 py-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">🏁 Tu Carrera</p>
                {raceDays !== null && raceDays > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-black text-[#1e3a5f] leading-none">{raceDays}</span>
                      <span className="text-sm text-gray-400">días</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      para tu {activePlan?.name ?? 'carrera'} · {raceDate
                        ? new Date(raceDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                        : ''}
                    </p>
                    {activePlan && (
                      <>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                          <div className="h-full bg-[#ea580c] rounded-full"
                            style={{ width: `${Math.round((planData.currentWeek / planData.totalWeeks) * 100)}%` }} />
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] text-gray-400">Semana {planData.currentWeek} de {planData.totalWeeks}</p>
                          <Link href="/plan" className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">Ver plan →</Link>
                        </div>
                      </>
                    )}
                  </>
                ) : activePlan ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-black text-[#1e3a5f] leading-none">{planData.currentWeek}</span>
                      <span className="text-sm text-gray-400">/ {planData.totalWeeks}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">{activePlan.name}</p>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-[#ea580c] rounded-full"
                        style={{ width: `${Math.round((planData.currentWeek / planData.totalWeeks) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-gray-400">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${PHASE_COLORS[planData.phase] ?? 'bg-gray-100 text-gray-600'}`}>
                          {phaseDisplay}
                        </span>
                      </p>
                      <Link href="/plan" className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">Ver plan →</Link>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">Sin plan activo</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card 2: Tu Meta de Peso */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex h-full">
            <div className="w-1 bg-[#3b6fdd] shrink-0" />
            <div className="flex-1 px-4 py-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">⚖️ Tu Meta de Peso</p>
              {currentWeight && targetWeight ? (
                <>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-3xl font-black text-[#1e3a5f] leading-none">{currentWeight.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">kg</span>
                    <span className="text-sm text-gray-300 mx-1">→</span>
                    <span className="text-lg font-semibold text-[#3b6fdd]">{targetWeight} kg</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-3">
                    {weeklyWeightChange != null
                      ? `~${Math.max(0, Math.ceil(Math.abs((currentWeight - targetWeight) / (Math.abs(weeklyWeightChange) || 0.5))))} semanas · ${weeklyWeightChange > 0 ? '+' : ''}${weeklyWeightChange.toFixed(1)} kg/sem`
                      : 'registra check-ins para ver tendencia'}
                  </p>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-[#3b6fdd] rounded-full" style={{ width: `${weightProgressPct ?? 0}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-400">{weightProgressPct ?? 0}% completado</p>
                    <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd]">Ver progreso →</Link>
                  </div>
                </>
              ) : currentWeight ? (
                <>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-black text-[#1e3a5f] leading-none">{currentWeight.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">kg</span>
                  </div>
                  <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd] mt-3 block">Define tu meta →</Link>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-2">Sin datos de peso</p>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Cómo llegás hoy */}
        <Link href="/checkin" className={`rounded-2xl border shadow-sm overflow-hidden block transition-shadow hover:shadow-md
          ${formStatus === 'good' ? 'bg-green-50 border-green-200' :
            formStatus === 'moderate' ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'}`}>
          <div className="flex h-full">
            <div className={`w-1 shrink-0
              ${formStatus === 'good' ? 'bg-[#22c55e]' :
                formStatus === 'moderate' ? 'bg-amber-500' :
                'bg-red-500'}`} />
            <div className="flex-1 px-4 py-4">
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2
                ${formStatus === 'good' ? 'text-green-600' :
                  formStatus === 'moderate' ? 'text-amber-600' :
                  'text-red-600'}`}>
                ⚡ Cómo llegás hoy
              </p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">
                  {formStatus === 'good' ? '🟢' : formStatus === 'moderate' ? '🟡' : '🔴'}
                </span>
                <p className="text-base font-bold text-[#1e3a5f] leading-tight">{formMessage}</p>
              </div>
              {lastCheckIn ? (
                <>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {lastCheckIn.energyLevel != null && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                        ${formStatus === 'good' ? 'bg-green-100 text-green-700' :
                          formStatus === 'moderate' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'}`}>
                        Energía {lastCheckIn.energyLevel}/10
                      </span>
                    )}
                    {lastCheckIn.hardestSessionRpe != null && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        RPE {lastCheckIn.hardestSessionRpe}
                      </span>
                    )}
                    {lastCheckIn.sleepHours != null && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Sueño {lastCheckIn.sleepHours}h
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Actualizar →  · {formCheckInDate}</p>
                </>
              ) : (
                <p className="text-[11px] text-gray-500 mt-2">Hacer check-in →</p>
              )}
            </div>
          </div>
        </Link>

      </div>
      )}

      <div className="space-y-6">

        {/* ── Columna principal ── */}
        <div className="space-y-5">

          {/* Esta semana */}
          <section>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Esta semana</h2>
                <p className="text-xs text-gray-400 mt-0.5">{weekDateLabel}</p>
                {dashboardMode === 'TRAINING' && (totalTraining > 0 || currentVolume) && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {totalTraining > 0 && (
                      <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {completedCount}/{totalTraining} sesiones
                      </span>
                    )}
                    {currentVolume && (
                      <span className="text-[11px] font-semibold bg-[#1e3a5f]/5 text-[#1e3a5f] border border-[#1e3a5f]/10 px-2 py-0.5 rounded-full">
                        {currentVolume} km planificados
                      </span>
                    )}
                  </div>
                )}
              </div>
              {dashboardMode === 'TRAINING' && (
                <WeekNavBar
                  weekLabel={`Sem. ${selectedWeekNum || planData.currentWeek}`}
                  weekOffset={weekOffset}
                  canGoPrev={selectedWeekNum > 1}
                  canGoNext={true}
                />
              )}
            </div>
            {(weeklySummary ?? gymModeSummary ?? freeModeSummary) && (
              <p className="text-sm text-gray-500 mb-3 leading-relaxed">{weeklySummary ?? gymModeSummary ?? freeModeSummary}</p>
            )}

            <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">

              {/* ── RECOVERY: tarjeta de celebración plan completado ── */}
              {dashboardMode === 'RECOVERY' && lastCompletedPlanInfo && (
                <div className="mb-4">
                  <PlanCompletionCard
                    planName={lastCompletedPlanInfo.name}
                    totalWeeks={lastCompletedPlanInfo.totalWeeks}
                    sessionsLogged={lastCompletedPlanInfo.sessionsLogged}
                    sessionsTotal={lastCompletedPlanInfo.sessionsTotal}
                    recoveryDaysSinceEnd={recoveryDaysSinceEnd ?? 0}
                    isB2B={session.user.isB2B ?? false}
                  />
                </div>
              )}

              {/* FREE: bienvenida prominente */}
              {dashboardMode === 'FREE' && (
                <div className="mb-4">
                  <FreeDashboard
                    firstName={firstName}
                    isNewUser={!lastCompletedPlanInfo}
                    completedPlanName={lastCompletedPlanInfo?.name ?? null}
                    streakDays={streakDays}
                    weekSessionCount={weekSessionCount}
                  />
                </div>
              )}

              {/* Strip de días — calendar API unificado (sport + gym con completion real) */}
              <DashboardCalendarStrip
                weekOffset={weekOffset}
                showProgressBar={dashboardMode === 'TRAINING'}
              />

              <DailySessionCard
                dashboardMode={dashboardMode}
                isCurrentWeek={isCurrentWeek}
                todaySession={todaySession}
                hasActivePlan={!!activePlan}
                hasGymToday={hasGymToday}
                todayGymDay={todayGymDay}
                planPhase={planData.phase}
                phaseDisplay={phaseDisplay}
                phaseColors={PHASE_COLORS}
                selectedWeekNum={selectedWeekNum || planData.currentWeek}
                totalWeeks={planData.totalWeeks}
                completedCount={completedCount}
                totalTraining={totalTraining}
                todayRoutineDay={todayRoutineDay}
                weekSessionCount={weekSessionCount}
                weekSessionTarget={weekSessionTarget}
                weekActivities={weekActivities}
              />
            </div>
          </section>

          {/* Check-in banner — solo si está pendiente */}
          {checkinPending && (
            <Link href="/checkin" className="block">
              <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden flex hover:shadow-[0_2px_8px_rgba(249,115,22,0.12)] transition-shadow">
                <div className="w-1 bg-[#ea580c] shrink-0" />
                <div className="flex-1 flex items-center justify-between px-4 py-3.5 gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Check-in semanal pendiente</p>
                    <p className="text-xs text-gray-500 mt-0.5">{activePlan ? 'Tu plan se ajusta automáticamente según cómo te sientas' : 'Registrá cómo te sentís esta semana para ver tu evolución'}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                </div>
              </div>
            </Link>
          )}


          {/* Card coach real — solo si tiene coach asignado */}
          {coachRelation && (
            <CoachCard
              name={coachRelation.coach.name ?? null}
              headline={coachRelation.coach.coachProfile?.headline ?? coachRelation.coach.coachProfile?.specialties?.[0] ?? null}
              slug={coachRelation.coach.coachProfile?.slug ?? null}
            />
          )}

          {/* Resumen Rápido */}
          <WeeklySummaryCard
            lastCheckIn={lastCheckIn ? {
              hardestSessionRpe: lastCheckIn.hardestSessionRpe ?? null,
              energyLevel: lastCheckIn.energyLevel ?? null,
              weightKg: lastCheckIn.weightKg ?? null,
            } : null}
            formCheckInDate={formCheckInDate}
            currentVolume={currentVolume ?? null}
            volumeDeltaPct={volumeDeltaPct ?? null}
            completedCount={completedCount}
            totalTraining={totalTraining}
          />

        </div>{/* fin columna principal */}


      </div>{/* fin layout grid */}
      </div>
    </div>
  )
}
