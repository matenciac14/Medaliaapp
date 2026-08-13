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
import InfoBannerRow from '../_components/InfoBannerRow'
import WeeklySummaryCard from '../_components/WeeklySummaryCard'
import DailySessionCard from '../_components/DailySessionCard'
import PlanCompletionCard from '../_components/PlanCompletionCard'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import { jsToOurDow } from '@/lib/core/date-utils'
import { selectActivePlan } from '@/lib/plan/active-plan'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { getDashboardSummary } from '@/domain/dashboard/get-dashboard-summary.use-case'
import StreakShareButton from '../_components/StreakShareButton'
import TodayLogCard from '../_components/TodayLogCard'

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


function getGreeting(tz: string) {
  try {
    // hourCycle h23 garantiza rango 0–23 (evita "24" en medianoche con hour12: false)
    const h = parseInt(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(new Date()),
      10,
    )
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  } catch {
    // Timezone inválido → fallback a UTC offset +0 (conservador)
    const h = new Date().getUTCHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }
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
  const [dbUser, activePlansRaw, coachRelationRaw, assignedWorkoutRaw, nutritionPlan, recentLogs, weeklyRoutine, recentGymSessions, pendingSuggestionsCount, todayLogRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        checkIns: { orderBy: { recordedAt: 'desc' }, take: 12 },
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
      select: { id: true, completedAt: true, freeSessionType: true, durationMin: true, rpe: true, plannedSession: { select: { type: true } } },
    }),
    prisma.weeklyRoutine.findUnique({ where: { userId } }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true },
      orderBy: { date: 'desc' },
      take: 60,
      select: { date: true, durationMin: true, assignedWorkout: { select: { template: { select: { name: true } } } } },
    }),
    prisma.checkInSuggestion.count({
      where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } },
    }),
    (() => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      return prisma.dailyLog.findFirst({
        where: { userId, date: { gte: todayStart } },
        select: { weightKg: true, energyLevel: true },
      })
    })(),
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
  const todayDateStr = new Date().toDateString()
  const gymDoneToday = recentGymSessions.some((gs) => new Date(gs.date).toDateString() === todayDateStr)

  // ── Self-directed: today's routine day + weekly session count ─────────────
  type RoutineDayConfig = { dow: number; activity: 'GYM' | 'RUN' | 'REST'; split?: string; runType?: string }
  const routineDays = (weeklyRoutine?.days ?? []) as RoutineDayConfig[]
  const todayRoutineDay = routineDays.find((d) => d.dow === todayDow) ?? null

  // Count distinct days with any activity this week (Mon=start)
  // Uses rawWeekOffset so FREE/GYM/RECOVERY modes can navigate weeks
  const weekStart = (() => {
    const today = new Date()
    const dow = today.getDay() === 0 ? 7 : today.getDay()
    const monday = new Date(today)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(today.getDate() - (dow - 1) + rawWeekOffset * 7)
    return monday
  })()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Previous week range (for weekSessionDelta)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekEnd = new Date(weekStart)
  prevWeekEnd.setTime(prevWeekEnd.getTime() - 1) // last ms of prev week

  const [weekFreeLogs, weekGymSessions, prevWeekFreeLogs, prevWeekGymSessions, weekFoodLogs] = activePlan ? [[], [], [], [], []] : await Promise.all([
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
    prisma.sessionLog.findMany({
      where: { userId, plannedSessionId: null, completedAt: { gte: prevWeekStart, lte: prevWeekEnd } },
      select: { completedAt: true },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true, date: { gte: prevWeekStart, lte: prevWeekEnd } },
      select: { date: true },
    }),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      select: { date: true, kcalLogged: true },
    }),
  ])
  const activeDaysThisWeek = new Set([
    ...weekFreeLogs.map((l) => new Date(l.completedAt).toDateString()),
    ...weekGymSessions.map((g) => new Date(g.date).toDateString()),
  ])
  const weekSessionCount = activeDaysThisWeek.size

  // Previous week session count (for delta)
  const prevWeekActiveDays = new Set([
    ...prevWeekFreeLogs.map((l) => new Date(l.completedAt).toDateString()),
    ...prevWeekGymSessions.map((g) => new Date(g.date).toDateString()),
  ])
  const prevWeekSessionCount = prevWeekActiveDays.size
  const weekSessionDelta = prevWeekSessionCount > 0 ? weekSessionCount - prevWeekSessionCount : null

  // Avg kcal/day from FoodLog this week
  const avgKcalPerDay = (() => {
    if (weekFoodLogs.length === 0) return null
    const byDay = new Map<string, number>()
    for (const log of weekFoodLogs) {
      const key = new Date(log.date).toDateString()
      byDay.set(key, (byDay.get(key) ?? 0) + (log.kcalLogged ?? 0))
    }
    if (byDay.size === 0) return null
    const total = Array.from(byDay.values()).reduce((a, b) => a + b, 0)
    return Math.round(total / byDay.size)
  })()

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
  let weekOffset = rawWeekOffset
  let selectedWeekNum = 0
  let isCurrentWeek = weekOffset === 0

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

  // ── getDashboardSummary — shared pure use case (web + mobile) ────────────
  // USED: streakDays, raceDays, isRecomp, formStatus/formMessage, weight progress,
  //   weeklyWeightChange, checkinPending, nutritionTarget, volumeDelta,
  //   recentActivity, hasEverLogged, metrics
  // BYPASSED: todaySession, weekSessions, planData — web recomputes these from
  //   PlannedSession (PERF-01 full load) because:
  //   1. BUG-056: free-session fallback requires SessionLog join
  //   2. Week navigation offset requires per-week PlannedSession queries
  //   If todaySession logic changes, update BOTH this bypass AND the use case.
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
      rpe: l.rpe ?? null,
      plannedSession: l.plannedSession ?? null,
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
    recentGymSessions: recentGymSessions.map(gs => ({
      date: gs.date,
      durationMin: gs.durationMin ?? null,
      templateName: gs.assignedWorkout?.template.name ?? null,
    })),
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
    return rangeStr
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



  return (
    <div className="sm:py-5 lg:px-8 lg:py-6 max-w-6xl mx-auto sm:space-y-5">

      {/* ── Mobile gradient header (< sm) ─────────────────────── */}
      <div className="sm:hidden bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] pb-5 px-5 pt-[max(env(safe-area-inset-top,0px),44px)] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[22px] font-black text-white tracking-tight leading-tight flex-1">
            {getGreeting(dbUser.timezone ?? 'America/Bogota')}, {firstName}
          </h1>
          <span className="text-[10px] font-bold text-white border border-white/60 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            {dashboardMode === 'FREE' ? 'FREE' : coachRelation ? 'B2B' : 'PRO'}
          </span>
          <Link href="/notifications" className="relative shrink-0 ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          </Link>
        </div>
        <p className="text-[12px] text-white/60">{formatDate()}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {activePlan && (
            <span className="bg-white/[0.18] text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
              Semana {planData.currentWeek}/{planData.totalWeeks} · {phaseDisplay}
            </span>
          )}
          {streakDays > 0 ? (
            <span className="bg-white/[0.18] text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
              🔥 {streakDays} días · racha
            </span>
          ) : (
            <span className="bg-white/[0.10] text-white/50 text-xs font-semibold px-3 py-1.5 rounded-xl">
              — sin racha aún
            </span>
          )}
        </div>
      </div>

      {/* PWA install banner — solo tablet/mobile, solo si no está instalada */}
      <div className="lg:hidden hidden sm:block">
        <InstallPWABanner />
      </div>

      <div className="px-4 lg:px-0 sm:space-y-5 space-y-4 sm:pt-0 pt-4">
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

      {/* Header — desktop/tablet (sm+) */}
      <div className="hidden sm:flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {getGreeting(dbUser.timezone ?? 'America/Bogota')}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {streakDays >= 2 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-[11px] font-semibold text-[#ea580c]">
              🔥 {streakDays} días · racha activa
            </span>
          )}
          <StreakShareButton streakDays={streakDays} />
        </div>
      </div>

      {/* ── Mobile: TodaySession / Qué entrenas hoy (< sm) ──── */}
      <div className="sm:hidden">
        {todaySession ? (
          <div className="rounded-[20px] overflow-hidden shadow-sm">
            <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-4 pt-3.5 pb-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-semibold text-white/55 tracking-widest uppercase">Hoy</span>
                {todaySession.zoneTarget && todaySession.zoneTarget !== 'N/A' && (
                  <span className="bg-green-500/[0.28] text-green-300 text-[11px] font-semibold px-2 py-0.5 rounded-lg">
                    ● Zona {todaySession.zoneTarget}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[34px]">{SESSION_ICONS[todaySession.type] ?? '🏅'}</span>
                <div className="flex-1">
                  <span className="text-[26px] font-black text-white tracking-tight leading-none">{todaySession.durationMin} min</span>
                </div>
                {todaySession.completed && (
                  <span className="bg-green-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">✓ Hecha</span>
                )}
              </div>
              <span className="text-[11px] text-white/60">{SESSION_NAMES[todaySession.type] ?? todaySession.type.replace(/_/g, ' ').toLowerCase()}</span>
            </div>
            {!todaySession.completed && (
              <div className="bg-white px-4 py-3">
                <Link href={todaySession.id === 'gym-today' ? '/gym/session' : `/log/run?sessionId=${todaySession.id}&type=${todaySession.type}&duration=${todaySession.durationMin}&zone=${todaySession.zoneTarget}`}
                  className="block bg-[#ea580c] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">
                  {todaySession.id === 'gym-today' ? 'Ir al Gym →' : 'Registrar sesión'}
                </Link>
              </div>
            )}
          </div>
        ) : dashboardMode === 'FREE' ? (
          <>
            {todayRoutineDay?.activity === 'GYM' ? (
              <div className="rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-4 pt-3.5 pb-4 space-y-2">
                  <span className="text-[9px] font-semibold text-white/55 tracking-widest uppercase">Hoy</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[34px]">💪</span>
                    <span className="text-[22px] font-black text-white tracking-tight">Gym hoy</span>
                  </div>
                </div>
                <div className="bg-white px-4 py-3">
                  <Link href="/gym" className="block bg-[#1e3a5f] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">Empezar</Link>
                </div>
              </div>
            ) : todayRoutineDay?.activity === 'RUN' ? (
              <div className="rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <div className="bg-gradient-to-b from-[#ea580c] to-[#d14d07] px-4 pt-3.5 pb-4 space-y-2">
                  <span className="text-[9px] font-semibold text-white/55 tracking-widest uppercase">Hoy</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[34px]">🏃</span>
                    <span className="text-[22px] font-black text-white tracking-tight">Correr hoy</span>
                  </div>
                </div>
                <div className="bg-white px-4 py-3">
                  <Link href="/log/run" className="block bg-[#ea580c] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">Registrar</Link>
                </div>
              </div>
            ) : todayRoutineDay?.activity === 'REST' ? (
              <div className="bg-white rounded-[20px] p-[18px] flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <span className="text-[28px]">😴</span>
                <div>
                  <p className="text-[15px] font-semibold text-gray-900">Descanso hoy según tu rutina</p>
                  <p className="text-[13px] text-gray-500 mt-0.5">Recupera bien — vuelves mañana</p>
                </div>
              </div>
            ) : (
              /* Figma: centrado, ícono circular, "Sin sesión planificada", CTA full-width */
              <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <div className="h-[3px] bg-[#ea580c]" />
                <div className="px-5 pt-5 pb-4 text-center space-y-2">
                  <div className="flex justify-center">
                    <span className="flex items-center gap-1.5 text-[#ea580c] text-[10px] font-bold uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-[#ea580c]" /> Hoy
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#ea580c]/10 flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[17px] font-bold text-gray-900">Sin sesión planificada</p>
                  <p className="text-[13px] text-gray-400">Registra tu entrenamiento de hoy</p>
                  <Link href="/log/run" className="block bg-[#ea580c] text-white text-[15px] font-bold text-center py-3.5 rounded-xl mt-3">
                    Registrar actividad →
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : dashboardMode === 'RECOVERY' ? (
          <div className="rounded-[20px] overflow-hidden shadow-sm">
            <div className="h-[3px] bg-green-500" />
            <div className="bg-green-50 p-[18px] flex items-center gap-3.5">
              <span className="text-[32px]">🏆</span>
              <div className="flex-1">
                <span className="text-[9px] font-semibold text-green-600 tracking-widest uppercase">Plan completado</span>
                <p className="text-[15px] font-bold text-green-900 mt-1">{lastCompletedPlanInfo?.name ?? 'Plan terminado'}</p>
                <p className="text-[12px] text-green-500 mt-1">
                  {recoveryDaysSinceEnd != null && recoveryDaysSinceEnd <= 14
                    ? `Recuperación activa · ${14 - recoveryDaysSinceEnd} días restantes`
                    : 'Listo para un nuevo plan'}
                </p>
              </div>
            </div>
          </div>
        ) : hasGymToday ? (
          <div className="rounded-[20px] overflow-hidden shadow-sm">
            <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] px-4 pt-3.5 pb-4 space-y-2">
              <span className="text-[9px] font-semibold text-white/55 tracking-widest uppercase">Hoy</span>
              <div className="flex items-center gap-3">
                <span className="text-[34px]">💪</span>
                <span className="text-[22px] font-black text-white tracking-tight">
                  {assignedWorkout?.template.name ?? 'Gym hoy'}
                </span>
              </div>
            </div>
            <div className="bg-white px-4 py-3">
              <Link href="/gym/session" className="block bg-[#1e3a5f] text-white text-[15px] font-bold text-center py-3.5 rounded-xl">
                {gymDoneToday ? '✓ Completada' : 'Empezar'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[20px] p-[18px] flex items-center gap-3 shadow-sm">
            <span className="text-[28px]">😴</span>
            <div>
              <p className="text-[15px] font-semibold text-gray-900">Día de descanso</p>
              <p className="text-[13px] text-gray-500 mt-0.5">Recupera bien hoy</p>
            </div>
          </div>
        )}
      </div>

      {/* Hero cards — desktop only (3-col grid) */}
      {(
      <div className="hidden sm:grid sm:grid-cols-3 gap-3">

        {/* Card 1: Tu Actividad (FREE) · Tu Rutina (GYM) · Tu Objetivo (recomp) · Tu Carrera (running) */}
        {dashboardMode === 'FREE' ? (
          /* FREE: resumen de actividad semanal */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex h-full">
              <div className="w-1 bg-[#ea580c] shrink-0" />
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">📊 TU ACTIVIDAD</p>
                {weekSessionCount > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-2xl font-black text-[#1e3a5f] leading-none">{weekSessionCount}</span>
                      <span className="text-sm text-gray-400">sesiones</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-1.5">registradas · último mes</p>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black text-[#1e3a5f] leading-none block mb-0.5">—</span>
                    <p className="text-[11px] text-gray-500 mb-1.5">Sin sesiones registradas aún</p>
                  </>
                )}
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-[#ea580c] rounded-full" style={{ width: `${Math.min(100, Math.round((weekSessionCount / Math.max(weekSessionTarget, 1)) * 100))}%` }} />
                </div>
                <div className="flex justify-between items-center">
                  {weekSessionCount > 0 && streakDays >= 2 ? (
                    <p className="text-[10px] text-[#ea580c]">Racha activa: {streakDays} días 🔥</p>
                  ) : <p className="text-[10px] text-gray-400" />}
                  <Link href="/log" className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">{weekSessionCount > 0 ? 'Ver log →' : 'Registrar →'}</Link>
                </div>
              </div>
            </div>
          </div>
        ) : dashboardMode === 'GYM' ? (
          /* GYM: rutina asignada activa */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">💪 Tu Rutina</p>
                <p className="text-sm font-bold text-[#1e3a5f] leading-tight mb-0.5">
                  {assignedWorkout?.template.name ?? 'Rutina activa'}
                </p>
                <p className="text-[11px] text-gray-500 mb-1.5">
                  {weekSessionCount} de {weekSessionTarget} días esta semana
                </p>
                <div className="flex items-center gap-1 mb-1.5">
                  {Array.from({ length: weekSessionTarget }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${i < weekSessionCount ? 'bg-[#ea580c]' : 'bg-gray-100'}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-gray-400">
                    {weekSessionCount >= weekSessionTarget ? 'Meta semanal cumplida' : `Faltan ${weekSessionTarget - weekSessionCount}`}
                  </p>
                  <Link href={`/gym?selectedDow=${todayDow}`} className="text-[10px] font-semibold text-[#ea580c] py-2 -my-2 inline-block">Ver rutina →</Link>
                </div>
            </div>
          </div>
        ) : isRecomp ? (
          /* Recomposición corporal */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">🎯 Tu Objetivo</p>
                {currentWeight && targetWeight ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-2xl font-black text-[#1e3a5f] leading-none">
                        ~{weeklyWeightChange
                          ? Math.max(0, Math.ceil(Math.abs((currentWeight - targetWeight) / (weeklyWeightChange || 0.5)) * 7))
                          : '—'}
                      </span>
                      <span className="text-sm text-gray-400">días</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-1.5">
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
        ) : (
          /* Atleta de carrera */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">🏁 Tu Carrera</p>
                {raceDays !== null && raceDays > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-2xl font-black text-[#1e3a5f] leading-none">{raceDays}</span>
                      <span className="text-sm text-gray-400">días</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-1.5">
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
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-2xl font-black text-[#1e3a5f] leading-none">{planData.currentWeek}</span>
                      <span className="text-sm text-gray-400">/ {planData.totalWeeks}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-1.5">{activePlan.name}</p>
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
        )}

        {/* Card 2: Tu Peso */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex h-full">
            <div className="w-1 bg-[#3b6fdd] shrink-0" />
            <div className="flex-1 px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">⚖️ {targetWeight ? 'TU META DE PESO' : 'TU PESO'}</p>
              {currentWeight && targetWeight ? (
                <>
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-2xl font-black text-[#1e3a5f] leading-none">{currentWeight.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">kg</span>
                    <span className="text-sm text-gray-300 mx-1">→</span>
                    <span className="text-lg font-semibold text-[#3b6fdd]">{targetWeight} kg</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-1.5">
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
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-2xl font-black text-[#1e3a5f] leading-none">{currentWeight.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">kg</span>
                  </div>
                  <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd] mt-3 block">Define tu meta →</Link>
                </>
              ) : (
                <>
                  <span className="text-2xl font-black text-[#1e3a5f] leading-none block mb-0.5">—</span>
                  <p className="text-[11px] text-gray-500 mb-1.5">Sin datos de peso registrados</p>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-gray-100 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <div className="flex justify-end">
                    <Link href="/progress" className="text-[10px] font-semibold text-[#3b6fdd]">Registrar peso →</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Nutrición Hoy (FREE) · Cómo llegás hoy (con plan) */}
        {dashboardMode === 'FREE' ? (
          <Link href="/nutrition" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden block transition-shadow hover:shadow-md">
            <div className="flex h-full">
              <div className="w-1 bg-[#22c55e] shrink-0" />
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">🍽️ NUTRICIÓN HOY</p>
                {dashSummary.nutritionTarget ? (
                  <>
                    <p className="text-base font-black text-[#1e3a5f] leading-none mb-0.5">{dashSummary.nutritionTarget.kcal} kcal</p>
                    <p className="text-[10px] text-gray-400 mb-2">según tu perfil</p>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">P {dashSummary.nutritionTarget.proteinG}g</span>
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">C {dashSummary.nutritionTarget.carbsG}g</span>
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">G {dashSummary.nutritionTarget.fatG}g</span>
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className="text-[10px] font-semibold text-[#22c55e]">Ver detalle →</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black text-[#1e3a5f] leading-none block mb-0.5">—</span>
                    <p className="text-[11px] text-gray-500 mb-1.5">Sin registros nutricionales</p>
                    <div className="flex justify-end">
                      <span className="text-[10px] font-semibold text-[#22c55e]">Registrar →</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/checkin" className={`rounded-2xl border shadow-sm overflow-hidden block transition-shadow hover:shadow-md
            ${formStatus === 'good' ? 'bg-green-50 border-green-200' :
              formStatus === 'moderate' ? 'bg-amber-50 border-amber-200' :
              'bg-red-50 border-red-200'}`}>
            <div className="px-4 py-3">
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1
                  ${formStatus === 'good' ? 'text-green-600' :
                    formStatus === 'moderate' ? 'text-amber-600' :
                    'text-red-600'}`}>
                  ⚡ Cómo llegás hoy
                </p>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-lg">
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
                          Energía {lastCheckIn.energyLevel}/5
                        </span>
                      )}
                      {lastCheckIn.hardestSessionRpe != null && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          RPE {lastCheckIn.hardestSessionRpe}/10
                        </span>
                      )}
                      {lastCheckIn.sleepHours != null && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Sueño ✓
                        </span>
                      )}
                      {dashSummary.metrics.hrResting != null && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          FC basal {dashSummary.metrics.hrResting} bpm
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Actualizar →  · {formCheckInDate}</p>
                  </>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-2">Hacer check-in →</p>
                )}
            </div>
          </Link>
        )}

      </div>
      )}

      <div className="space-y-5">

        {/* ── Columna principal ── */}
        <div className="space-y-4">

          {/* Esta semana / Tu semana */}
          <section>
            {/* Desktop header row — hidden on phone */}
            <div className="mb-3 hidden sm:flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                Esta semana
              </h2>
              {dashboardMode === 'TRAINING' ? (
                <WeekNavBar
                  weekLabel={`Semana ${selectedWeekNum || planData.currentWeek} · ${weekDateLabel}`}
                  weekOffset={weekOffset}
                  canGoPrev={selectedWeekNum > 1}
                  canGoNext={true}
                />
              ) : (
                <WeekNavBar
                  weekLabel={weekDateLabel}
                  weekOffset={weekOffset}
                  canGoPrev={true}
                  canGoNext={true}
                />
              )}
              {dashboardMode === 'TRAINING' && totalTraining > 0 && (
                <span className="text-xs text-gray-400 shrink-0">
                  {completedCount} / {totalTraining} completadas
                </span>
              )}
              {dashboardMode === 'FREE' && (
                <span className="text-xs text-gray-400 shrink-0">
                  {weekSessionCount} completadas
                </span>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-3">

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

              {/* Strip de días — calendar API unificado (sport + gym con completion real) */}
              <DashboardCalendarStrip
                weekOffset={weekOffset}
                dashboardMode={dashboardMode}
                firstName={firstName}
                weekLabel={dashboardMode === 'TRAINING' ? `Semana ${selectedWeekNum || planData.currentWeek} · ${weekDateLabel}` : weekDateLabel}
                mobileCount={dashboardMode === 'TRAINING' && totalTraining > 0 ? `${completedCount}/${totalTraining} sesiones` : dashboardMode === 'FREE' ? `${weekSessionCount} registros` : ''}
              />

              {dashboardMode !== 'FREE' && (
                <DailySessionCard
                  dashboardMode={dashboardMode}
                  isCurrentWeek={isCurrentWeek}
                  todaySession={todaySession}
                  hasActivePlan={!!activePlan}
                  hasGymToday={hasGymToday}
                  gymDoneToday={gymDoneToday}
                  todayGymDay={todayGymDay}
                  planPhase={planData.phase}
                  phaseDisplay={phaseDisplay}
                  phaseColors={PHASE_COLORS}
                  selectedWeekNum={selectedWeekNum || planData.currentWeek}
                  totalWeeks={planData.totalWeeks}
                  completedCount={completedCount}
                  totalTraining={totalTraining}
                  weekSessionCount={weekSessionCount}
                  weekSessionTarget={weekSessionTarget}
                  isB2B={session.user.isB2B ?? false}
                  coachName={coachRelation?.coach.name ?? null}
                />
              )}
            </div>
          </section>

          {/* ── Mobile-only: cards en orden Figma ─────────────── */}
          <div className="sm:hidden space-y-3">

            {dashboardMode === 'FREE' ? (
              <>
                {/* FREE: Tu Actividad */}
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pt-1 border-t border-gray-100">Tu actividad</p>
                {dashSummary.hasEverLogged ? (
                  <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="h-[3px] bg-[#ea580c]" />
                    {dashSummary.recentActivity.slice(0, 3).map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}
                      >
                        <span className="text-[22px]">{SESSION_ICONS[a.type] ?? '🏅'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-gray-900">{SESSION_NAMES[a.type] ?? a.type.replace(/_/g, ' ')}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {a.durationMin ? ` · ${a.durationMin} min` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="h-[3px] bg-[#ea580c]" />
                    <div className="px-3.5 py-3">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-2">📋 Última actividad</p>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[28px]">📝</span>
                        <div className="flex-1">
                          <p className="text-[15px] font-semibold text-gray-900">Registra tu primera sesión</p>
                          <p className="text-[12px] text-[#ea580c] mt-0.5">
                            <Link href="/log/run">Running</Link> · <Link href="/gym">Gym</Link> · Lo que practiques →
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* FREE: Meta de Peso */}
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pt-1 border-t border-gray-100">Meta de peso</p>
                <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="h-[3px] bg-[#3b82f6]" />
                  <div className="px-3.5 py-3 flex items-start">
                    <div className="flex-1">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">META DE PESO</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-[#1e3a5f] tracking-tight leading-none">
                          {currentWeight ? currentWeight.toFixed(1) : '—'}
                        </span>
                        <span className="text-sm text-gray-400">kg</span>
                        {targetWeight && (
                          <span className="text-xs font-semibold text-[#22c55e]">→ {targetWeight} kg</span>
                        )}
                      </div>
                      {!currentWeight && (
                        <Link href="/progress" className="text-[11px] font-semibold text-[#ea580c] mt-1.5 block">Configura tu meta →</Link>
                      )}
                      {weeklyWeightChange != null && (
                        <p className={`text-[10px] mt-1 ${
                          (() => {
                            const losing = (currentWeight ?? 0) > (targetWeight ?? 0)
                            return losing
                              ? (weeklyWeightChange < 0 ? 'text-[#22c55e]' : 'text-red-500')
                              : (weeklyWeightChange > 0 ? 'text-[#22c55e]' : 'text-red-500')
                          })()
                        }`}>
                          {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange} kg esta semana
                        </p>
                      )}
                    </div>
                    {weightProgressPct != null ? (
                      <div className="bg-green-50 rounded-xl p-2.5 text-center min-w-[60px]">
                        <p className="text-lg font-black text-[#22c55e]">{weightProgressPct}%</p>
                        <p className="text-[9px] text-gray-400">del objetivo</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center min-w-[60px]">
                        <p className="text-lg font-black text-gray-300">0%</p>
                        <p className="text-[9px] text-gray-400">sin datos aún</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* FREE: Nutrición Hoy */}
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pt-1 border-t border-gray-100">Nutrición hoy</p>
                {dashSummary.nutritionTarget && (
                  <Link href="/nutrition" className="block bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-3.5 py-3">
                    <div className="flex items-center mb-2">
                      <span className="text-sm">🍽️</span>
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest ml-1.5 flex-1">Nutrición hoy · objetivo base</p>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-black text-[#1e3a5f] tracking-tight">{dashSummary.nutritionTarget.kcal}</span>
                      <span className="text-sm font-semibold text-gray-400">kcal</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">P {dashSummary.nutritionTarget.proteinG}g</span>
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">C {dashSummary.nutritionTarget.carbsG}g</span>
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">G {dashSummary.nutritionTarget.fatG}g</span>
                    </div>
                  </Link>
                )}

                {/* FREE: Registro de hoy */}
                <TodayLogCard initial={todayLogRaw ?? null} />

                {/* FREE: Desbloquea Plan Pro — Figma DS (3405:54) */}
                <Link href="/pricing" className="flex items-center gap-3 bg-[#fff7ed] border border-[rgba(234,89,9,0.3)] rounded-xl overflow-hidden px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">⚡</span>
                      <p className="text-[13px] font-semibold text-[#993300]">Desbloquea Plan Pro</p>
                    </div>
                    <p className="text-[11px] text-[#8c4d1a] mt-0.5">Check-in · zonas · progreso</p>
                  </div>
                  <span className="text-xs font-semibold text-white bg-[#ea5909] px-3 py-2 rounded-lg shrink-0">Ver Pro</span>
                </Link>

                {/* FREE: Encuentra tu entrenador — Figma DS (3405:63) */}
                <Link href="/find-coach" className="flex items-center gap-2.5 bg-[#1e3a5f] rounded-lg overflow-hidden pr-3.5">
                  <div className="w-1 self-stretch bg-[#ea5809] shrink-0" />
                  <div className="flex-1 min-w-0 py-2.5">
                    <p className="text-[13px] font-semibold text-white">🎯  Encuentra tu entrenador</p>
                    <p className="text-[11px] text-[#b2cce5] mt-0.5">Planes personalizados con un experto</p>
                  </div>
                  <span className="text-xs font-semibold text-[#ea5809] shrink-0">Ver coaches →</span>
                </Link>
              </>
            ) : (
              <>
                {/* B2B/Pro: Coach card */}
                {coachRelation && (
                  <Link href="/messages" className="flex items-center bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="w-1 h-14 bg-[#ea580c] shrink-0" />
                    <div className="flex-1 flex items-center gap-3 px-3 py-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#ea580c] flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(coachRelation.coach.name ?? 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1e3a5f] truncate">Coach {(coachRelation.coach.name ?? '').split(' ')[0]}</p>
                        <p className="text-[11px] text-gray-500 truncate">{coachRelation.coach.coachProfile?.headline ?? 'Entrenador personal'}</p>
                      </div>
                      <span className="text-sm text-gray-300">›</span>
                    </div>
                  </Link>
                )}

                {/* B2B/Pro: Check-in pendiente */}
                {checkinPending && (
                  <Link href="/checkin" className="flex items-center bg-orange-50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="w-1 bg-[#ea580c] shrink-0 self-stretch" />
                    <div className="flex-1 px-3.5 py-3">
                      <p className="text-xs font-semibold text-orange-900">Check-in semanal pendiente</p>
                      <p className="text-[10px] text-orange-700 mt-1">Registra métricas · tu plan se ajusta automáticamente →</p>
                    </div>
                  </Link>
                )}

                {/* B2B/Pro: Estado actual (fusión Forma + Último Check-in) */}
                <Link href="/checkin" className={`block rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden
                  ${formStatus === 'good' ? 'bg-green-50' : formStatus === 'moderate' ? 'bg-amber-50' : 'bg-red-50'}`}>
                  <div className={`h-[3px] ${formStatus === 'good' ? 'bg-green-500' : formStatus === 'moderate' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <div className="px-3.5 py-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className={`text-[9px] font-semibold uppercase tracking-widest
                        ${formStatus === 'good' ? 'text-green-600' : formStatus === 'moderate' ? 'text-amber-600' : 'text-red-600'}`}>
                        {formStatus === 'good' ? '⚡' : formStatus === 'moderate' ? '⚠️' : '😴'} Cómo llegás hoy
                      </p>
                      {formCheckInDate && <p className="text-[9px] text-gray-400">{formCheckInDate}</p>}
                    </div>
                    <p className="text-[14px] font-bold text-[#1e3a5f] leading-tight mb-2">{formMessage}</p>
                    {lastCheckIn && (
                      <div className="flex gap-1.5 flex-wrap">
                        {lastCheckIn.energyLevel != null && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                            ${formStatus === 'good' ? 'bg-green-100 text-green-700' : formStatus === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            Energía {lastCheckIn.energyLevel}/5
                          </span>
                        )}
                        {lastCheckIn.hardestSessionRpe != null && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            RPE {lastCheckIn.hardestSessionRpe}/10
                          </span>
                        )}
                        {lastCheckIn.weightKg != null && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {lastCheckIn.weightKg} kg
                          </span>
                        )}
                        {lastCheckIn.sleepHours != null && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Sueño ✓
                          </span>
                        )}
                        {dashSummary.metrics.hrResting != null && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            FC basal {dashSummary.metrics.hrResting} bpm
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                {/* B2B/Pro: Tu Carrera / Tu Objetivo */}
                <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="h-[3px] bg-[#ea580c]" />
                  <div className="px-3.5 py-3">
                    <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                      {isRecomp ? '🎯 Tu Objetivo' : '🏁 Tu Carrera'}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#ea580c] tracking-tight leading-none">
                        {isRecomp
                          ? (currentWeight && targetWeight ? Math.abs(currentWeight - targetWeight).toFixed(1) : '—')
                          : (raceDays != null && raceDays > 0 ? raceDays : '—')}
                      </span>
                      <span className="text-sm font-semibold text-gray-400">
                        {isRecomp ? 'kg restantes' : 'días'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* B2B/Pro: Meta de Peso */}
                <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="h-[3px] bg-[#3b6fdd]" />
                  <div className="px-3.5 py-3 flex items-start">
                    <div className="flex-1">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">⚖️ Meta de peso</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-[#1e3a5f] tracking-tight leading-none">
                          {currentWeight ? currentWeight.toFixed(1) : '—'}
                        </span>
                        <span className="text-sm text-gray-400">kg</span>
                        {targetWeight && (
                          <span className="text-sm font-semibold text-[#22c55e]">→ {targetWeight} kg</span>
                        )}
                      </div>
                      {weeklyWeightChange != null && (
                        <p className={`text-[10px] mt-1 ${weeklyWeightChange < 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {weeklyWeightChange > 0 ? '+' : ''}{weeklyWeightChange.toFixed(1)} kg esta semana
                        </p>
                      )}
                    </div>
                    {weightProgressPct != null && (
                      <div className="bg-green-50 rounded-xl p-2.5 text-center min-w-[60px]">
                        <p className="text-lg font-black text-[#22c55e]">{weightProgressPct}%</p>
                        <p className="text-[9px] text-gray-400">del objetivo</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* B2B/Pro: Carga Semanal */}
                {currentVolume != null && (
                  <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="h-[3px] bg-[#ea580c]" />
                    <div className="px-3.5 py-3 flex items-start">
                      <div className="flex-1">
                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">🏃 Carga semanal</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-[#ea580c] tracking-tight leading-none">{currentVolume}</span>
                          <span className="text-sm font-semibold text-gray-400">km</span>
                          {volumeDeltaPct != null && (
                            <span className={`text-xs font-semibold ml-1 ${volumeDeltaPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% vs sem. anterior
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* B2B/Pro: Nutrición Hoy */}
                {dashSummary.nutritionTarget && (
                  <Link href="/nutrition" className="block bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-3.5 py-3">
                    <div className="flex items-center mb-2">
                      <span className="text-sm">🍽️</span>
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest ml-1.5 flex-1">Nutrición hoy</p>
                      <span className="text-[9px] font-bold text-white bg-[#ea580c] px-2 py-0.5 rounded-full uppercase">
                        {dashSummary.nutritionTarget.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-black text-[#1e3a5f] tracking-tight">{dashSummary.nutritionTarget.kcal}</span>
                      <span className="text-sm font-semibold text-gray-400">kcal</span>
                      <span className="text-[10px] text-gray-400 ml-1">ajustado por sesión</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">P {dashSummary.nutritionTarget.proteinG}g</span>
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">C {dashSummary.nutritionTarget.carbsG}g</span>
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">G {dashSummary.nutritionTarget.fatG}g</span>
                    </div>
                  </Link>
                )}

                {/* B2B/Pro: Registro de hoy */}
                <TodayLogCard initial={todayLogRaw ?? null} />

                {/* B2B/Pro: Actividad reciente */}
                {(dashSummary.recentActivity?.length ?? 0) > 0 && (
                  <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="px-3.5 pt-3.5 pb-1 flex justify-between items-center">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Actividad reciente</p>
                      {dashSummary.streakDays > 0 && (
                        <p className="text-[10px] text-[#f97316]">🔥 {dashSummary.streakDays} días de racha</p>
                      )}
                    </div>
                    {dashSummary.recentActivity.slice(0, 5).map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}
                      >
                        <span className="text-[22px]">{SESSION_ICONS[a.type] ?? '🏅'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900">{SESSION_NAMES[a.type] ?? a.type.replace(/_/g, ' ')}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {new Date(a.completedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {a.durationMin ? ` · ${a.durationMin} min` : ''}
                          </p>
                        </div>
                        {a.rpe != null && (
                          <span className="text-[11px] font-semibold text-[#1e3a5f] bg-gray-100 rounded-lg px-2 py-1">RPE {a.rpe}</span>
                        )}
                      </div>
                    ))}
                    <div className="px-3.5 pb-3 pt-1">
                      <Link
                        href="/log/run"
                        className="block bg-gray-100 rounded-[10px] py-2.5 text-center text-[13px] font-semibold text-[#1e3a5f] hover:bg-gray-200 transition-colors"
                      >
                        + Registrar actividad
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {/* ── Fin mobile-only ───────────────────────────────── */}

          {/* Info banner row — desktop only (nutrición + coach + check-in) */}
          {dashboardMode !== 'FREE' && (
            <div className="hidden sm:block">
            <InfoBannerRow
              nutrition={dashSummary.nutritionTarget ? {
                targetKcal: dashSummary.nutritionTarget.kcal,
                intensityLabel: dashSummary.nutritionTarget.label,
                proteinG: dashSummary.nutritionTarget.proteinG,
                carbsG: dashSummary.nutritionTarget.carbsG,
                fatG: dashSummary.nutritionTarget.fatG,
              } : null}
              coach={coachRelation ? {
                name: coachRelation.coach.name ?? 'Tu coach',
                headline: coachRelation.coach.coachProfile?.headline ?? coachRelation.coach.coachProfile?.specialties?.[0] ?? null,
                initial: (coachRelation.coach.name ?? 'C').charAt(0).toUpperCase(),
              } : null}
              checkinPending={checkinPending}
              hasActivePlan={!!activePlan}
            />
            </div>
          )}

          {/* B2C Free: banner desbloquea — desktop only (mobile banners in mobile-only section) */}
          {dashboardMode === 'FREE' && (
            <Link href="/find-coach" className="hidden sm:block">
              <div className="flex bg-orange-50 rounded-2xl border border-orange-200/60 overflow-hidden">
                <div className="w-1 bg-[#ea580c] shrink-0" />
                <div className="flex-1 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#ea580c]/10 flex items-center justify-center text-base shrink-0">
                      🔓
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Desbloquea el potencial de Medaliq</p>
                      <p className="text-xs text-gray-500 mt-0.5">Check-in adaptativo, ajustes automaticos y metricas — con un entrenador o Plan Pro</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-[#1e3a5f] border border-gray-200 bg-white px-3 py-1.5 rounded-lg whitespace-nowrap">
                      Buscar entrenador
                    </span>
                    <span className="text-xs font-semibold text-white bg-[#ea580c] px-3 py-1.5 rounded-lg whitespace-nowrap">
                      Activar Pro →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Resumen rápido — desktop only (mobile has its own cards above) */}
          {dashboardMode !== 'FREE' && (
            <h2 className="hidden sm:block text-xs font-bold text-gray-900 uppercase tracking-wider">Resumen rápido</h2>
          )}
          <div className="hidden sm:block">
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
            variant={dashboardMode === 'FREE' ? 'free' : 'default'}
            weekSessionCount={weekSessionCount}
            weekSessionTarget={weekSessionTarget}
            weekSessionDelta={weekSessionDelta}
            avgKcalPerDay={avgKcalPerDay}
          />
          </div>

        </div>{/* fin columna principal */}


      </div>{/* fin layout grid */}
      </div>
    </div>
  )
}
