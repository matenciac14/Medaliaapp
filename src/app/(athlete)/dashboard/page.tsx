import Link from 'next/link'
import { CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { PlanStatus } from '@/generated/prisma/enums'
import { redirect } from 'next/navigation'
import { parseUserConfig } from '@/lib/config/user-config'
import InstallPWABanner from '@/app/_components/InstallPWABanner'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'
import QuickLog from '../_components/QuickLog'
import WeekNavBar from '../_components/WeekNavBar'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import { jsToOurDow, jsToWeekIdx } from '@/lib/core/date-utils'

// Mon-first week labels (idx 0=Mon … 6=Sun)
const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}


export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ weekOffset?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id
  const { weekOffset: weekOffsetParam } = await searchParams
  const rawWeekOffset = parseInt(weekOffsetParam ?? '0') || 0

  // ── Fetch completo ─────────────────────────────────────────────────────────
  const [dbUser, activePlansRaw, coachRelationRaw, assignedWorkoutRaw, nutritionPlan, recentLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        checkIns: { orderBy: { recordedAt: 'desc' }, take: 10 },
        dailyLogs: { orderBy: { date: 'desc' }, take: 1 },
      },
    }),
    prisma.trainingPlan.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: { sessions: { orderBy: { dayOfWeek: 'asc' }, include: { log: true } } },
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
      select: { completedAt: true },
    }),
  ])

  if (!dbUser) redirect('/login')

  // ── Seleccionar el plan ACTIVE correcto cuando hay duplicados ─────────────
  let activePlanRaw: (typeof activePlansRaw)[0] | null = activePlansRaw[0] ?? null
  if (activePlansRaw.length > 1) {
    let bestLogCount = -1
    for (const p of activePlansRaw) {
      const logCount = p.weeks.flatMap(w => w.sessions).filter(s => s.log).length
      if (logCount > bestLogCount) { bestLogCount = logCount; activePlanRaw = p }
    }
    const winnerIds = new Set([activePlanRaw?.id])
    const loserIds = activePlansRaw.filter(p => !winnerIds.has(p.id)).map(p => p.id)
    if (loserIds.length > 0) {
      await prisma.trainingPlan.updateMany({
        where: { id: { in: loserIds } },
        data: { status: PlanStatus.COMPLETED },
      }).catch(() => {})
    }
  }

  // ── Lifecycle: detectar plan expirado → RECOVERY / FREE ───────────────────
  type DashboardMode = 'TRAINING' | 'RECOVERY' | 'FREE'
  type CompletedPlanInfo = { endDate: Date; name: string; totalWeeks: number; sessionsLogged: number; sessionsTotal: number }
  let lastCompletedPlanInfo: CompletedPlanInfo | null = null

  if (activePlanRaw) {
    const now = new Date()
    const rawWeek = Math.floor((now.getTime() - new Date(activePlanRaw.startDate).getTime()) / 86400000 / 7) + 1
    if (rawWeek > activePlanRaw.totalWeeks && now > new Date(activePlanRaw.endDate)) {
      await prisma.trainingPlan.update({
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
    : lastCompletedPlanInfo && recoveryDaysSinceEnd !== null && recoveryDaysSinceEnd <= 14
      ? 'RECOVERY'
      : 'FREE'

  const firstName = (dbUser.name ?? dbUser.email ?? 'Atleta').split(' ')[0]

  // ── AI chat: límite mensual ────────────────────────────────────────────────
  const userConfig = parseUserConfig(dbUser.config)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const aiMessagesUsed = userConfig.ai.messagesResetAt === currentMonth
    ? userConfig.ai.messagesThisMonth
    : 0
  const aiMonthlyLimit = userConfig.ai.monthlyLimit
  const nextMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1))
  const aiResetAt = nextMonth.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
  const profile = dbUser.profile
  const lastCheckIn = dbUser.checkIns[0] ?? null
  const lastDailyLog = dbUser.dailyLogs[0] ?? null
  const coachRelation = coachRelationRaw ?? null
  const assignedWorkout = assignedWorkoutRaw ?? null
  const todayDow = jsToOurDow(new Date().getDay())
  const todayGymDay = assignedWorkout?.template.days.find((d) => d.dayOfWeek === todayDow) ?? null
  const hasGymToday = !!(todayGymDay && !todayGymDay.isRestDay)

  // ── Plan y semana actual ───────────────────────────────────────────────────
  let planData = { name: 'Sin plan', totalWeeks: 0, currentWeek: 0, phase: 'BASE' }
  let todaySession: { id: string; type: string; intensity: string; durationMin: number; zoneTarget: string; detailText: string; completed: boolean } | null = null
  let weekSessionMap: Record<number, { type: string; label: string; done: boolean; durationMin: number; zoneTarget: string; intensity: string }> = {}
  let currentWeekVolumeKm: number | null = null
  let weekOffset = 0
  let selectedWeekNum = 0
  let isCurrentWeek = true

  if (activePlan) {
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - new Date(activePlan.startDate).getTime()) / 86400000)
    const rawWeek = Math.floor(diffDays / 7) + 1
    const currentWeek = Math.max(1, Math.min(activePlan.totalWeeks, rawWeek))

    // Offset libre de calendario — solo impedimos ir antes del inicio del plan
    weekOffset = Math.max(1 - currentWeek, rawWeekOffset)
    selectedWeekNum = currentWeek + weekOffset
    isCurrentWeek = weekOffset === 0

    // currentPlanWeek: always the real current week (for todaySession card)
    const currentPlanWeek = activePlan.weeks.find(w => w.weekNumber === currentWeek)
      ?? activePlan.weeks[activePlan.weeks.length - 1]
      ?? null

    // selectedPlanWeek: la semana que muestra el strip — null si está fuera del plan
    const selectedPlanWeek = activePlan.weeks.find(w => w.weekNumber === selectedWeekNum) ?? null

    planData = {
      name: activePlan.name,
      totalWeeks: activePlan.totalWeeks,
      currentWeek,
      phase: currentPlanWeek?.phase ?? 'BASE',
    }

    // todaySession always from the real current week
    if (currentPlanWeek) {
      const todayPlanned = currentPlanWeek.sessions.find(s => s.dayOfWeek === todayDow) ?? null
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

    // weekSessionMap from selectedPlanWeek (the one the strip shows)
    if (selectedPlanWeek) {
      for (const s of selectedPlanWeek.sessions) {
        const idx = jsToWeekIdx(s.dayOfWeek)
        weekSessionMap[idx] = {
          type: s.type,
          label: (s.detailText ?? s.type).slice(0, 28),
          done: !!s.log,
          durationMin: s.durationMin,
          zoneTarget: s.zoneTarget ?? '',
          intensity: s.intensity ?? 'MODERATE',
        }
      }
      currentWeekVolumeKm = selectedPlanWeek.volumeKm ?? null
    }
  }

  // ── GYM users (no TrainingPlan): fill weekSessionMap from assignedWorkout ──
  if (!activePlan && assignedWorkout) {
    for (const day of assignedWorkout.template.days) {
      const idx = jsToWeekIdx(day.dayOfWeek)
      weekSessionMap[idx] = {
        type: day.isRestDay ? 'DESCANSO' : 'FUERZA',
        label: day.isRestDay ? 'Descanso' : ((day as any).label ?? (day as any).muscleGroups?.[0] ?? 'Gym'),
        done: false,
        durationMin: 60,
        zoneTarget: '',
        intensity: 'MODERATE',
      }
    }
  }

  // ── Métricas reales ────────────────────────────────────────────────────────
  const weightKg = lastDailyLog?.weightKg ?? lastCheckIn?.weightKg ?? profile?.weightKg ?? null
  const hrResting = lastDailyLog?.hrResting ?? lastCheckIn?.hrResting ?? profile?.hrResting ?? null
  const sleepHours = lastDailyLog?.sleepHours ?? lastCheckIn?.sleepHours ?? profile?.sleepHoursAvg ?? null
  const hasMetrics = !!(weightKg || hrResting || sleepHours)

  // ── Nutrición del día ────────────────────────────────────────────────────
  const dailyNutrition = nutritionPlan
    ? getDailyNutritionTarget(todaySession?.intensity ?? null, {
        targetKcalHard: nutritionPlan.targetKcalHard,
        targetKcalEasy: nutritionPlan.targetKcalEasy,
        targetKcalRest: nutritionPlan.targetKcalRest,
        proteinG: nutritionPlan.proteinG,
        carbsHardG: nutritionPlan.carbsHardG,
        carbsEasyG: nutritionPlan.carbsEasyG,
        fatG: nutritionPlan.fatG,
      })
    : null

  // ── Día actual ────────────────────────────────────────────────────────────
  const todayWeekIdx = jsToWeekIdx(new Date().getDay())
  const completedCount = Object.values(weekSessionMap).filter(s => s.done && s.type !== 'DESCANSO').length
  const totalTraining = Object.values(weekSessionMap).filter(s => s.type !== 'DESCANSO').length

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
  // Fecha numérica para cada día del strip (0=Lun…6=Dom)
  const weekDayDates: Record<number, number> = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStartDate)
      d.setDate(d.getDate() + i)
      return [i, d.getDate()]
    })
  )

  // ── Check-in semanal pendiente ─────────────────────────────────────────────
  // Usar la misma lógica que la API: semanas desde inicio del plan (o ISO week si no hay plan)
  const checkinWeekNumber = activePlan
    ? planData.currentWeek
    : Math.ceil(((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000))
  const thisWeekCheckIn = dbUser.checkIns.find(c => c.weekNumber === checkinWeekNumber) ?? null
  const checkinPending = !thisWeekCheckIn

  const phaseDisplay = phaseLabel(planData.phase)

  // ── Streak (días consecutivos con sesión completada) ─────────────────────
  let streakDays = 0
  const todayStr = new Date()
  todayStr.setHours(0, 0, 0, 0)
  const logDateSet = new Set(recentLogs.map((l: { completedAt: Date }) => new Date(l.completedAt).toDateString()))
  for (let i = 0; i <= 59; i++) {
    const d = new Date(todayStr)
    d.setDate(d.getDate() - i)
    if (logDateSet.has(d.toDateString())) streakDays++
    else break
  }

  // ── Hero card 1: Tu Carrera / Tu Objetivo ─────────────────────────────────
  const raceDate = (profile?.sportDetails as Record<string, unknown> | null)?.raceDate as string | undefined
  const raceDays = raceDate
    ? Math.ceil((new Date(raceDate).getTime() - Date.now()) / 86400000)
    : null
  const isRecomp = !!(
    userConfig.sport?.goal?.includes('BODY') ||
    activePlan?.name?.toLowerCase().includes('recomp') ||
    activePlan?.name?.toLowerCase().includes('body')
  )

  // ── Hero card 2: Meta de peso ──────────────────────────────────────────────
  const currentWeight = weightKg
  const targetWeight = profile?.weightGoalKg ?? null
  const prevCheckIn = dbUser.checkIns[1] ?? null
  let weeklyWeightChange: number | null = null
  if (lastCheckIn?.weightKg && prevCheckIn?.weightKg) {
    const daysDiff = Math.max(1,
      (new Date(lastCheckIn.recordedAt).getTime() - new Date(prevCheckIn.recordedAt).getTime()) / 86400000
    )
    weeklyWeightChange = ((lastCheckIn.weightKg - prevCheckIn.weightKg) / daysDiff) * 7
  }
  const oldestCheckInWeight = [...dbUser.checkIns].reverse().find((c: { weightKg: number | null }) => c.weightKg != null)?.weightKg ?? null
  let weightProgressPct: number | null = null
  if (currentWeight && targetWeight && oldestCheckInWeight && oldestCheckInWeight !== targetWeight) {
    weightProgressPct = Math.min(100, Math.max(0,
      Math.round(((oldestCheckInWeight - currentWeight) / (oldestCheckInWeight - targetWeight)) * 100)
    ))
  }

  // ── Hero card 3: Cómo llegás hoy ──────────────────────────────────────────
  type FormStatus = 'good' | 'moderate' | 'rest'
  let formStatus: FormStatus = 'good'
  let formMessage = 'Sin datos de check-in'
  let formCheckInDate: string | null = null
  if (lastCheckIn) {
    const energy = lastCheckIn.energyLevel ?? 3
    const rpe = lastCheckIn.hardestSessionRpe ?? 5
    const sleep = (lastCheckIn.sleepHours ?? 7) >= 6.5
    if (energy >= 4 && rpe <= 7 && sleep) {
      formStatus = 'good'; formMessage = 'Listo para entrenar fuerte'
    } else if (energy >= 3 && rpe <= 8) {
      formStatus = 'moderate'; formMessage = 'Carga moderada recomendada'
    } else {
      formStatus = 'rest'; formMessage = 'Prioriza la recuperación hoy'
    }
    const daysAgo = Math.floor((Date.now() - new Date(lastCheckIn.recordedAt).getTime()) / 86400000)
    formCheckInDate = daysAgo === 0 ? 'hoy' : daysAgo === 1 ? 'ayer' : `hace ${daysAgo} días`
  }

  // ── Carga semanal (volumen planificado) ────────────────────────────────────
  const currentVolume = currentWeekVolumeKm
  const prevPlanWeekData = activePlan?.weeks.find((w: { weekNumber: number }) => w.weekNumber === planData.currentWeek - 1)
  const prevVolume = prevPlanWeekData?.volumeKm ?? null
  const volumeDeltaPct = currentVolume && prevVolume
    ? Math.round(((currentVolume - prevVolume) / prevVolume) * 100)
    : null

  // ── Adherencia últimas 4 semanas ─────────────────────────────────────────
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

  return (
    <div className="py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto space-y-6">

      {/* PWA install banner — solo mobile, solo si no está instalada */}
      <div className="lg:hidden">
        <InstallPWABanner />
      </div>

      <div className="px-4 lg:px-0 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {getGreeting()}, {firstName} 👋
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-gray-500 capitalize">{formatDate()}</p>
          {streakDays >= 2 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200/60 text-[11px] font-semibold text-[#f97316]">
              🔥 {streakDays} días · racha activa
            </span>
          )}
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

      {/* Hero cards — 3 stats enfocados en el atleta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Card 1: Tu Carrera (con raceDate) o Tu Objetivo (recomp) */}
        {isRecomp ? (
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
              <div className="w-1 bg-[#f97316] shrink-0" />
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
                          <div className="h-full bg-[#f97316] rounded-full"
                            style={{ width: `${Math.round((planData.currentWeek / planData.totalWeeks) * 100)}%` }} />
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] text-gray-400">Semana {planData.currentWeek} de {planData.totalWeeks}</p>
                          <Link href="/plan" className="text-[10px] font-semibold text-[#f97316]">Ver plan →</Link>
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
                      <div className="h-full bg-[#f97316] rounded-full"
                        style={{ width: `${Math.round((planData.currentWeek / planData.totalWeeks) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-gray-400">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${PHASE_COLORS[planData.phase] ?? 'bg-gray-100 text-gray-600'}`}>
                          {phaseDisplay}
                        </span>
                      </p>
                      <Link href="/plan" className="text-[10px] font-semibold text-[#f97316]">Ver plan →</Link>
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
                        Energía {lastCheckIn.energyLevel}/5
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

      <div className="space-y-6">

        {/* ── Columna principal ── */}
        <div className="space-y-5">

          {/* Esta semana */}
          <section>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Esta semana</h2>
                <p className="text-xs text-gray-400 mt-0.5">{weekDateLabel}</p>
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
            <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">

              {/* ── RECOVERY: banner plan completado ── */}
              {dashboardMode === 'RECOVERY' && lastCompletedPlanInfo && (
                <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-green-800">🏆 {lastCompletedPlanInfo.name}</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      {lastCompletedPlanInfo.sessionsLogged}/{lastCompletedPlanInfo.sessionsTotal} sesiones completadas
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-600 whitespace-nowrap shrink-0">
                    Recuperación · día {(recoveryDaysSinceEnd ?? 0) + 1}/14
                  </span>
                </div>
              )}

              {/* ── FREE: CTA nueva meta (si hay plan completado) ── */}
              {dashboardMode === 'FREE' && lastCompletedPlanInfo && (
                <div className="mb-4 p-3 bg-[#1e3a5f]/5 rounded-xl border border-[#1e3a5f]/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#1e3a5f]">¿Lista tu próxima meta?</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Completaste {lastCompletedPlanInfo.name} hace {recoveryDaysSinceEnd} días
                    </p>
                  </div>
                  <Link
                    href="/new-goal"
                    className="text-xs font-bold bg-[#f97316] text-white px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0"
                  >
                    Nueva meta
                  </Link>
                </div>
              )}

              {/* ── TRAINING: barra de progreso ── */}
              {dashboardMode === 'TRAINING' && totalTraining > 0 && (
                <div className="h-1 bg-gray-100 rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-[#22c55e] rounded-full transition-all" style={{ width: `${(completedCount / totalTraining) * 100}%` }} />
                </div>
              )}

              {/* Strip de días */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-7 sm:overflow-visible">
                {WEEK_DAYS.map((day, idx) => {
                  // isActuallyToday: solo marca HOY si estamos viendo la semana actual
                  const isActuallyToday = isCurrentWeek && idx === todayWeekIdx
                  const s = weekSessionMap[idx]
                  const isDone = s?.done
                  const isRest = s?.type === 'DESCANSO'
                  const hasSession = !!s && !isRest
                  const emoji = SESSION_ICONS[s?.type ?? ''] ?? (isRest ? '😴' : null)
                  const sessionName = SESSION_NAMES[s?.type ?? ''] ?? null

                  const cardBg = !s
                    ? isActuallyToday ? 'bg-gray-100 border border-gray-200' : 'bg-gray-50'
                    : isDone ? 'bg-[#22c55e]'
                    : isActuallyToday ? 'bg-[#1e3a5f]'
                    : hasSession ? 'bg-white border border-gray-200'
                    : 'bg-gray-50'

                  const dayColor = !s
                    ? isActuallyToday ? 'text-gray-500' : 'text-gray-300'
                    : isDone || isActuallyToday ? 'text-white/80' : 'text-gray-400'

                  const numColor = !s
                    ? 'text-gray-300'
                    : isDone || isActuallyToday ? 'text-white' : 'text-gray-900'

                  return (
                    <div key={day} className={`rounded-2xl flex-shrink-0 w-[104px] sm:w-auto p-3 flex flex-col gap-1 min-h-[120px] ${cardBg}`}>
                      <div className="flex items-start justify-between gap-1">
                        <span className={`text-[11px] font-semibold leading-none ${dayColor}`}>{day}</span>
                        {isDone && <span className="text-white text-xs leading-none">✓</span>}
                        {isActuallyToday && s && !isDone && (
                          <span className="text-[8px] font-bold bg-[#f97316] text-white px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">HOY</span>
                        )}
                        {isActuallyToday && !s && (
                          <span className="text-[8px] font-bold bg-gray-400 text-white px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">HOY</span>
                        )}
                      </div>
                      <span className={`text-[22px] font-black leading-none mt-0.5 ${numColor}`}>{weekDayDates[idx]}</span>
                      {emoji && <span className="text-xl leading-none mt-1">{emoji}</span>}
                      {sessionName && (
                        <span className={`text-[11px] font-semibold leading-tight mt-0.5 ${isDone || isActuallyToday ? 'text-white' : isRest ? 'text-gray-400' : 'text-gray-700'}`}>
                          {sessionName}
                        </span>
                      )}
                      {hasSession && s!.durationMin > 0 && (
                        <span className={`text-[10px] leading-none ${isDone || isActuallyToday ? 'text-white/70' : 'text-gray-400'}`}>
                          {s!.durationMin} min{s!.zoneTarget ? ` · ${s!.zoneTarget}` : ''}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── TRAINING: detalle sesión de hoy — solo si estamos en la semana actual ── */}
              {dashboardMode === 'TRAINING' && isCurrentWeek && todaySession && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{SESSION_ICONS[todaySession.type] ?? '🏅'}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {SESSION_NAMES[todaySession.type] ?? todaySession.type.replace(/_/g, ' ')}
                        </p>
                        <div className="flex gap-1.5 flex-wrap mt-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {todaySession.durationMin} min
                          </span>
                          {todaySession.zoneTarget && todaySession.zoneTarget !== '—' && todaySession.zoneTarget !== '' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Zona {todaySession.zoneTarget}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                            ${todaySession.intensity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              todaySession.intensity === 'LOW' ? 'bg-green-100 text-green-700' :
                              'bg-sky-100 text-sky-700'}`}>
                            {todaySession.intensity === 'HIGH' ? '🔥 ALTA' :
                             todaySession.intensity === 'LOW' ? '🌿 BAJA' : '⚡ MODERADA'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {todaySession.completed ? (
                        <span className="flex items-center gap-1 text-[#22c55e] text-sm font-semibold">
                          <CheckCircle2 size={16} /> Completada
                        </span>
                      ) : (
                        <QuickLog sessionId={todaySession.id} initialCompleted={false} />
                      )}
                      <Link href="/plan" className="text-xs font-semibold text-gray-400 hover:text-[#1e3a5f] transition-colors whitespace-nowrap">
                        Ver mi plan →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TRAINING: descanso o gym — solo si estamos en la semana actual ── */}
              {dashboardMode === 'TRAINING' && isCurrentWeek && activePlan && !todaySession && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                  <span>😴</span>
                  <span>Descanso hoy</span>
                </div>
              )}
              {isCurrentWeek && hasGymToday && !todaySession && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span>💪</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{todayGymDay!.label}</p>
                      <p className="text-xs text-gray-500">{todayGymDay!.exercises.length} ejercicios</p>
                    </div>
                  </div>
                  <Link href="/gym/session" className="text-xs font-semibold bg-[#f97316] text-white px-3 py-1.5 rounded-lg">
                    Empezar
                  </Link>
                </div>
              )}

              {/* ── RECOVERY: footer ── */}
              {dashboardMode === 'RECOVERY' && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">Movilidad, caminatas o descanso activo. Sin intensidad.</p>
                  <Link href="/log" className="text-xs font-semibold text-gray-400 hover:text-[#1e3a5f] whitespace-nowrap">
                    Registrar →
                  </Link>
                </div>
              )}

              {/* ── FREE: footer ── */}
              {dashboardMode === 'FREE' && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">Entrenamiento libre — sin estructura fija</p>
                  <Link href="/log" className="text-xs font-semibold text-[#f97316] hover:opacity-80 whitespace-nowrap">
                    + Registrar sesión
                  </Link>
                </div>
              )}

              {/* ── TRAINING: footer badges ── */}
              {dashboardMode === 'TRAINING' && activePlan && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2 flex-wrap items-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${PHASE_COLORS[planData.phase] ?? 'bg-gray-100 text-gray-600'}`}>
                    Fase {phaseDisplay}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                    Semana {selectedWeekNum || planData.currentWeek}/{planData.totalWeeks}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                    {completedCount}/{totalTraining} completadas
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Check-in banner — solo si está pendiente */}
          {checkinPending && (
            <Link href="/checkin" className="block">
              <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden flex hover:shadow-[0_2px_8px_rgba(249,115,22,0.12)] transition-shadow">
                <div className="w-1 bg-[#f97316] shrink-0" />
                <div className="flex-1 flex items-center justify-between px-4 py-3.5 gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Check-in semanal pendiente</p>
                    <p className="text-xs text-gray-500 mt-0.5">Tu plan se ajusta automáticamente según cómo te sientas</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                </div>
              </div>
            </Link>
          )}


          {/* Card coach real — solo si tiene coach asignado */}
          {coachRelation && (
            <section>
              <div className="bg-[#1e3a5f]/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold shrink-0">
                  {(coachRelation.coach.name ?? 'C').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{coachRelation.coach.name ?? 'Tu coach'}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {coachRelation.coach.coachProfile?.headline ?? coachRelation.coach.coachProfile?.specialties?.[0] ?? 'Coach deportivo'}
                  </p>
                </div>
                {coachRelation.coach.coachProfile?.slug && (
                  <Link
                    href={`/p/${coachRelation.coach.coachProfile.slug}`}
                    className="text-xs font-semibold text-[#1e3a5f] hover:text-[#f97316] transition-colors shrink-0"
                  >
                    Ver perfil →
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* Resumen Rápido */}
          {(lastCheckIn || currentVolume) && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resumen Rápido</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Último Check-in */}
                {lastCheckIn && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Último Check-in</p>
                      {formCheckInDate && <p className="text-[10px] text-gray-400">{formCheckInDate}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {lastCheckIn.hardestSessionRpe != null && (
                        <div className="bg-orange-50 rounded-xl px-3 py-2">
                          <p className="text-base font-semibold text-[#f97316] leading-none">{lastCheckIn.hardestSessionRpe}/10</p>
                          <p className="text-[10px] text-gray-500 mt-1">RPE</p>
                        </div>
                      )}
                      {lastCheckIn.energyLevel != null && (
                        <div className="bg-green-50 rounded-xl px-3 py-2">
                          <p className="text-base font-semibold text-[#22c55e] leading-none">{lastCheckIn.energyLevel}/5 ★</p>
                          <p className="text-[10px] text-gray-500 mt-1">Energía</p>
                        </div>
                      )}
                      {lastCheckIn.weightKg != null && (
                        <div className="bg-blue-50 rounded-xl px-3 py-2">
                          <p className="text-base font-semibold text-[#3b6fdd] leading-none">{lastCheckIn.weightKg} kg</p>
                          <p className="text-[10px] text-gray-500 mt-1">Peso</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Carga Semanal */}
                {currentVolume != null && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Carga Semanal</p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-2xl font-black text-[#1e3a5f]">{currentVolume} km</span>
                      {volumeDeltaPct != null && (
                        <span className={`text-xs font-semibold ${volumeDeltaPct >= 0 ? 'text-[#22c55e]' : 'text-red-500'}`}>
                          {volumeDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(volumeDeltaPct)}% vs sem. anterior
                        </span>
                      )}
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-[#f97316] rounded-full" style={{ width: `${Math.min(100, Math.round((completedCount / Math.max(totalTraining, 1)) * 100))}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {Math.round((completedCount / Math.max(totalTraining, 1)) * 100)}% del objetivo semanal
                    </p>
                  </div>
                )}

              </div>
            </section>
          )}

        </div>{/* fin columna principal */}


      </div>{/* fin layout grid */}
      </div>
    </div>
  )
}
