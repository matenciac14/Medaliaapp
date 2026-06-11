import Link from 'next/link'
import { CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import { parseUserConfig } from '@/lib/config/user-config'
import InstallPWABanner from '@/app/_components/InstallPWABanner'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'
import QuickLog from '../_components/QuickLog'

const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃',
  FARTLEK: '🏃',
  TIRADA_LARGA: '🏃',
  CICLA: '🚴',
  NATACION: '🏊',
  FUERZA: '💪',
  DESCANSO: '😴',
}

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

// Lunes=0 … Domingo=6 (semana laboral LatAm)
const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
// JS: 0=Dom,1=Lun…6=Sáb → convertir a índice Lun-Dom
function jsToWeekIdx(jsDay: number) {
  return jsDay === 0 ? 6 : jsDay - 1
}
// 1=Lun…7=Dom (para WorkoutDay.dayOfWeek)
function jsToOurDow(jsDay: number) {
  return jsDay === 0 ? 7 : jsDay
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  // ── Fetch completo ─────────────────────────────────────────────────────────
  const [dbUser, activePlanRaw, coachRelationRaw, assignedWorkoutRaw, nutritionPlan, recentLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        checkIns: { orderBy: { recordedAt: 'desc' }, take: 10 },
        dailyLogs: { orderBy: { date: 'desc' }, take: 1 },
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
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
  const activePlan = activePlanRaw ?? null
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
  let weekSessionMap: Record<number, { type: string; label: string; done: boolean }> = {}

  if (activePlan) {
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - new Date(activePlan.startDate).getTime()) / 86400000)
    const rawWeek = Math.floor(diffDays / 7) + 1
    const currentWeek = Math.max(1, Math.min(activePlan.totalWeeks, rawWeek))

    // Si el plan terminó, marcarlo COMPLETED para que no quede en "Semana 18/18" para siempre
    if (rawWeek > activePlan.totalWeeks && new Date() > new Date(activePlan.endDate)) {
      prisma.trainingPlan.update({
        where: { id: activePlan.id },
        data: { status: 'COMPLETED' },
      }).catch(() => {}) // fire-and-forget, no bloquear el render
    }
    const currentPlanWeek = activePlan.weeks.find(w => w.weekNumber === currentWeek)

    planData = {
      name: activePlan.name,
      totalWeeks: activePlan.totalWeeks,
      currentWeek,
      phase: currentPlanWeek?.phase ?? 'BASE',
    }

    // Sesión de hoy
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const todayPlanned = await prisma.plannedSession.findFirst({
      where: { week: { planId: activePlan.id }, date: { gte: todayStart, lte: todayEnd } },
      include: { log: true },
    })
    if (todayPlanned) {
      todaySession = {
        id: todayPlanned.id,
        type: todayPlanned.type,
        intensity: (todayPlanned as any).intensity ?? 'MODERATE',
        durationMin: todayPlanned.durationMin,
        zoneTarget: todayPlanned.zoneTarget ?? 'Z2',
        detailText: todayPlanned.detailText ?? '',
        completed: !!todayPlanned.log,
      }
    }

    // Mapa de sesiones por día de la semana (0=Lun…6=Dom)
    if (currentPlanWeek) {
      for (const s of currentPlanWeek.sessions) {
        const idx = jsToWeekIdx(s.dayOfWeek)
        weekSessionMap[idx] = {
          type: s.type,
          label: (s.detailText ?? s.type).slice(0, 28),
          done: !!s.log,
        }
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
  const completedCount = Object.values(weekSessionMap).filter(s => s.done).length
  const totalTraining = Object.keys(weekSessionMap).length

  // ── Check-in semanal pendiente ─────────────────────────────────────────────
  // Usar la misma lógica que la API: semanas desde inicio del plan (o ISO week si no hay plan)
  const checkinWeekNumber = activePlan
    ? planData.currentWeek
    : Math.ceil(((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000))
  const thisWeekCheckIn = await prisma.weeklyCheckIn.findUnique({
    where: { userId_weekNumber: { userId, weekNumber: checkinWeekNumber } },
  })
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
  const currentPlanWeekData = activePlan?.weeks.find((w: { weekNumber: number }) => w.weekNumber === planData.currentWeek)
  const prevPlanWeekData = activePlan?.weeks.find((w: { weekNumber: number }) => w.weekNumber === planData.currentWeek - 1)
  const currentVolume = currentPlanWeekData?.volumeKm ?? null
  const prevVolume = prevPlanWeekData?.volumeKm ?? null
  const volumeDeltaPct = currentVolume && prevVolume
    ? Math.round(((currentVolume - prevVolume) / prevVolume) * 100)
    : null

  // ── Banner trial expirando ────────────────────────────────────────────────
  let trialDaysLeft: number | null = null
  if (userConfig.trial?.plan === 'TRIAL' && userConfig.trial?.endsAt) {
    const msLeft = new Date(userConfig.trial.endsAt).getTime() - Date.now()
    const days = Math.ceil(msLeft / 86400000)
    if (days <= 5 && days > 0) trialDaysLeft = days
  }

  const SESSION_SHORT: Record<string, string> = {
    RODAJE_Z2: 'Z2', FARTLEK: 'FK', TIRADA_LARGA: 'TL',
    CICLA: 'CIC', NATACION: 'NAT', FUERZA: 'FZA', DESCANSO: '·',
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
          {trialDaysLeft !== null && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
              {trialDaysLeft}d trial
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

      {/* Banner trial expirando */}
      {trialDaysLeft !== null && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              Tu período de prueba vence en {trialDaysLeft} {trialDaysLeft === 1 ? 'día' : 'días'}
            </p>
          </div>
          <Link href="/upgrade" className="text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg shrink-0 hover:bg-amber-700 transition-colors">
            Activar Pro
          </Link>
        </div>
      )}

      {/* Layout: 2 columnas en desktop si AI Coach activo, columna única si no */}
      <div className={userConfig.features.aiCoach
        ? 'lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start space-y-6 lg:space-y-0'
        : 'space-y-6'
      }>

        {/* ── Columna principal ── */}
        <div className="space-y-5">

          {/* Esta semana — tarjetas estilo Figma */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Esta semana</h2>
              <span className="text-xs text-gray-400">{completedCount}/{totalTraining} completadas</span>
            </div>
            <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4">
              {totalTraining > 0 && (
                <div className="h-1 bg-gray-100 rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-[#22c55e] rounded-full transition-all" style={{ width: `${(completedCount / totalTraining) * 100}%` }} />
                </div>
              )}
              <div className="grid grid-cols-7 gap-1.5">
                {WEEK_DAYS.map((day, idx) => {
                  const isToday = idx === todayWeekIdx
                  const s = weekSessionMap[idx]
                  const isDone = s?.done
                  const isRest = s?.type === 'DESCANSO'
                  const hasSession = !!s && !isRest
                  return (
                    <div
                      key={day}
                      className={`rounded-xl px-1 py-2.5 flex flex-col items-center gap-1 text-center min-h-[60px] justify-center
                        ${isDone ? 'bg-[#22c55e]' :
                          isToday && hasSession ? 'bg-[#1e3a5f]' :
                          isToday ? 'bg-[#1e3a5f]/8 ring-2 ring-[#1e3a5f]/20' :
                          isRest ? 'bg-gray-50' :
                          hasSession ? 'bg-gray-100' : 'bg-gray-50'}`}
                    >
                      <span className={`text-[11px] font-semibold leading-none
                        ${isDone || (isToday && hasSession) ? 'text-white' :
                          isToday ? 'text-[#1e3a5f]' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      {isDone ? (
                        <CheckCircle2 size={11} className="text-white/90 mt-0.5" />
                      ) : hasSession ? (
                        <span className={`text-[8px] font-semibold leading-tight mt-0.5 text-center break-all
                          ${isToday ? 'text-white/80' : 'text-gray-400'}`}>
                          {SESSION_SHORT[s.type] ?? s.type.slice(0, 3)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300 mt-0.5">—</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Sesión de hoy — callout compacto dentro de la card */}
              {todaySession && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{SESSION_ICONS[todaySession.type] ?? '🏅'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {todaySession.durationMin} min · Zona {todaySession.zoneTarget}
                        </p>
                        <p className="text-xs text-gray-500 truncate capitalize">{todaySession.type.toLowerCase().replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {todaySession.completed ? (
                        <span className="flex items-center gap-1 text-[#22c55e] text-xs font-semibold">
                          <CheckCircle2 size={13} /> Hecha
                        </span>
                      ) : (
                        <>
                          <QuickLog sessionId={todaySession.id} initialCompleted={false} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!activePlan && (
                <p className="text-xs text-gray-400 mt-3 text-center">Sin plan activo</p>
              )}
              {activePlan && !todaySession && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                  <span>😴</span>
                  <span>{planData.currentWeek >= planData.totalWeeks ? '¡Plan completado! 🏆' : 'Descanso hoy'}</span>
                </div>
              )}
              {hasGymToday && !todaySession && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
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

              {activePlan && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${PHASE_COLORS[planData.phase] ?? 'bg-gray-100 text-gray-600'}`}>
                    Fase {phaseDisplay}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                    Semana {planData.currentWeek}/{planData.totalWeeks}
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

          {/* AI Coach link card — solo mobile */}
          {userConfig.features.aiCoach && (
            <div className="lg:hidden">
              <Link href="/ai-coach" className="block bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-bold shrink-0">AI</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">AI Coach</p>
                    <p className="text-xs text-gray-500">
                      {aiMonthlyLimit >= 999999
                        ? 'Mensajes ilimitados este mes'
                        : `${Math.max(0, aiMonthlyLimit - aiMessagesUsed)} mensajes disponibles`}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                </div>
              </Link>
            </div>
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

        {/* ── Columna derecha: AI Coach card (solo desktop) ── */}
        {userConfig.features.aiCoach && (
          <div className="hidden lg:block lg:sticky lg:top-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tu AI Coach</h2>
            <Link href="/ai-coach" className="block bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-bold shrink-0">AI</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">AI Coach</p>
                  <p className="text-xs text-gray-400">Powered by Claude</p>
                </div>
                <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />
              </div>
              <p className="text-sm text-gray-500 mb-4">Tu asistente deportivo. Pregunta sobre tu plan, recuperación o nutrición.</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {aiMonthlyLimit >= 999999
                    ? 'Mensajes ilimitados'
                    : `${Math.max(0, aiMonthlyLimit - aiMessagesUsed)} msgs disponibles`}
                </span>
                <span className="text-xs font-semibold text-[#f97316]">Abrir chat →</span>
              </div>
            </Link>
          </div>
        )}

      </div>{/* fin layout grid */}
      </div>
    </div>
  )
}
