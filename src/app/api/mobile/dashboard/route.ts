import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'

// Map session type → intensity bucket for kcal calc
function typeToIntensity(type: string | null): 'HIGH' | 'MODERATE' | 'LOW' | null {
  if (!type) return null
  if (['FARTLEK', 'TIRADA_LARGA'].includes(type)) return 'HIGH'
  if (['RODAJE_Z2', 'CICLA', 'NATACION', 'FUERZA'].includes(type)) return 'MODERATE'
  return 'LOW'
}

function getCurrentWeekNumber(startDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.max(1, Math.floor((Date.now() - startDate.getTime()) / msPerWeek) + 1)
}

function jsToOurDow(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

function getTrialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null
  const diff = new Date(endsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = mobile.id
  const todayDow = jsToOurDow(new Date().getDay())

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [user, activePlan, checkIns, recentLogs, nutritionPlan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, config: true,
        profile: { select: { weightKg: true, hrResting: true, weightGoalKg: true, sleepHoursAvg: true, sportDetails: true } },
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        weeks: {
          include: {
            sessions: {
              where: { type: { not: 'DESCANSO' } },
              include: { log: true },
            },
          },
          orderBy: { weekNumber: 'asc' },
        },
      },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 2,
      select: { recordedAt: true, weightKg: true, sleepHours: true, energyLevel: true, hardestSessionRpe: true },
    }),
    prisma.sessionLog.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 60,
      select: { completedAt: true },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
  ])

  const lastCheckIn = checkIns[0] ?? null
  const prevCheckIn = checkIns[1] ?? null

  // Today's planned session
  let todaySession = null
  if (activePlan) {
    const currentWeek = getCurrentWeekNumber(activePlan.startDate)
    const week = activePlan.weeks.find(w => w.weekNumber === currentWeek)
    const session = week?.sessions.find(s => s.dayOfWeek === todayDow)
    if (session && session.type !== 'DESCANSO') {
      todaySession = {
        id: session.id,
        type: session.type,
        durationMin: session.durationMin,
        zoneTarget: session.zoneTarget ?? '2',
        detailText: session.detailText ?? session.coachNote ?? '',
        completed: !!session.log,
      }
    }
  }

  // Weekly stats + 7-day strip
  let completedCount = 0
  let totalTraining = 0
  let planData = null
  // dayIndex 0=Mon … 6=Sun  |  our DOW 1=Mon … 7=Sun
  const weekSessions: { dayIndex: number; type: string | null; done: boolean; isToday: boolean; id: string | null; durationMin: number | null; zoneTarget: string | null }[] =
    Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, type: null, done: false, isToday: i + 1 === todayDow, id: null, durationMin: null, zoneTarget: null }))

  if (activePlan) {
    const currentWeek = getCurrentWeekNumber(activePlan.startDate)
    const week = activePlan.weeks.find(w => w.weekNumber === currentWeek)
    if (week) {
      totalTraining = week.sessions.length
      completedCount = week.sessions.filter(s => s.log).length
      // Map each session into the 7-day array (includes DESCANSO from all sessions)
      for (const s of week.sessions) {
        const idx = s.dayOfWeek - 1  // convert 1-7 → 0-6
        if (idx >= 0 && idx < 7) {
          weekSessions[idx].type = s.type
          weekSessions[idx].done = !!s.log
          weekSessions[idx].id = s.id
          weekSessions[idx].durationMin = s.durationMin
          weekSessions[idx].zoneTarget = s.zoneTarget ?? '2'
        }
      }
    }
    planData = {
      name: activePlan.name,
      currentWeek,
      totalWeeks: activePlan.totalWeeks,
      phase: activePlan.weeks.find(w => w.weekNumber === getCurrentWeekNumber(activePlan.startDate))?.phase ?? 'BASE',
    }
  }

  // Kcal target for today
  const intensity = typeToIntensity(todaySession?.type ?? null)
  const kcalTarget = nutritionPlan
    ? getDailyNutritionTarget(intensity, {
        targetKcalHard: nutritionPlan.targetKcalHard,
        targetKcalEasy: nutritionPlan.targetKcalEasy,
        targetKcalRest: nutritionPlan.targetKcalRest,
        proteinG: nutritionPlan.proteinG,
        carbsHardG: nutritionPlan.carbsHardG,
        carbsEasyG: nutritionPlan.carbsEasyG,
        fatG: nutritionPlan.fatG,
      }).kcal
    : null

  // Check-in pending (más de 7 días sin hacer)
  const checkinPending = !lastCheckIn || lastCheckIn.recordedAt < weekAgo

  // Trial days left
  const { parseUserConfig } = await import('@/lib/config/user-config')
  const config = parseUserConfig(user?.config)
  const trialDaysLeft = getTrialDaysLeft(config.trial.endsAt)

  // ── Streak ──────────────────────────────────────────────────────
  const logDateSet = new Set(recentLogs.map(l => new Date(l.completedAt).toDateString()))
  let streakDays = 0
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  for (let i = 0; i <= 59; i++) {
    const d = new Date(todayMidnight); d.setDate(d.getDate() - i)
    if (logDateSet.has(d.toDateString())) streakDays++
    else break
  }

  // ── Race countdown / isRecomp ────────────────────────────────────
  const sportDetails = user?.profile?.sportDetails as Record<string, unknown> | null
  const raceDateStr = sportDetails?.raceDate as string | undefined
  const raceDays = raceDateStr
    ? Math.ceil((new Date(raceDateStr).getTime() - Date.now()) / 86400000)
    : null
  const isRecomp = !!(
    config.sport?.goal?.includes('BODY') ||
    activePlan?.name?.toLowerCase().includes('recomp') ||
    activePlan?.name?.toLowerCase().includes('body')
  )

  // ── Form status ──────────────────────────────────────────────────
  type FormStatus = 'good' | 'moderate' | 'rest'
  let formStatus: FormStatus = 'good'
  let formMessage = 'Sin datos de check-in'
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
  }

  // ── Weight progress ──────────────────────────────────────────────
  const currentWeight = lastCheckIn?.weightKg ?? user?.profile?.weightKg ?? null
  const targetWeight = user?.profile?.weightGoalKg ?? null
  const startWeight = user?.profile?.weightKg ?? null
  let weeklyWeightChange: number | null = null
  if (lastCheckIn?.weightKg && prevCheckIn?.weightKg) {
    const daysDiff = Math.max(1,
      (new Date(lastCheckIn.recordedAt).getTime() - new Date(prevCheckIn.recordedAt).getTime()) / 86400000
    )
    weeklyWeightChange = Math.round(((lastCheckIn.weightKg - prevCheckIn.weightKg) / daysDiff) * 7 * 10) / 10
  }
  let weightProgressPct: number | null = null
  if (currentWeight && targetWeight && startWeight && startWeight !== targetWeight) {
    weightProgressPct = Math.min(100, Math.max(0,
      Math.round(((startWeight - currentWeight) / (startWeight - targetWeight)) * 100)
    ))
  }

  // ── Weekly volume ────────────────────────────────────────────────
  let currentVolume: number | null = null
  let volumeDeltaPct: number | null = null
  if (activePlan) {
    const currentWeekNum = getCurrentWeekNumber(activePlan.startDate)
    const currentWeekData = activePlan.weeks.find(w => w.weekNumber === currentWeekNum)
    const prevWeekData = activePlan.weeks.find(w => w.weekNumber === currentWeekNum - 1)
    currentVolume = currentWeekData?.volumeKm ?? null
    const prevVolume = prevWeekData?.volumeKm ?? null
    if (currentVolume && prevVolume) {
      volumeDeltaPct = Math.round(((currentVolume - prevVolume) / prevVolume) * 100)
    }
  }

  return NextResponse.json({
    firstName: (user?.name ?? 'Atleta').split(' ')[0],
    todaySession,
    planData,
    metrics: {
      weightKg: currentWeight,
      weightGoalKg: targetWeight,
      hrResting: user?.profile?.hrResting ?? null,
      sleepHours: lastCheckIn?.sleepHours ?? user?.profile?.sleepHoursAvg ?? null,
    },
    weekSessions,
    kcalTarget,
    completedCount,
    totalTraining,
    checkinPending,
    trialDaysLeft,
    // new fields
    streakDays,
    raceDays,
    isRecomp,
    formStatus,
    formMessage,
    lastCheckIn: lastCheckIn ? {
      energyLevel: lastCheckIn.energyLevel,
      hardestSessionRpe: lastCheckIn.hardestSessionRpe,
      sleepHours: lastCheckIn.sleepHours,
    } : null,
    weeklyWeightChange,
    weightProgressPct,
    currentVolume,
    volumeDeltaPct,
  })
}
