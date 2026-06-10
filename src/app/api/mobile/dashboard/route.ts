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

  const [user, activePlan, lastCheckIn, lastLog, nutritionPlan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, config: true, profile: { select: { weightKg: true, hrResting: true, weightGoalKg: true, sleepHoursAvg: true } } },
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
    prisma.weeklyCheckIn.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      select: { recordedAt: true, weightKg: true, sleepHours: true, energyLevel: true },
    }),
    prisma.sessionLog.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }),
    prisma.nutritionPlan.findUnique({ where: { userId } }),
  ])

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
  const weekSessions: { dayIndex: number; type: string | null; done: boolean; isToday: boolean }[] =
    Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, type: null, done: false, isToday: i + 1 === todayDow }))

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

  return NextResponse.json({
    firstName: (user?.name ?? 'Atleta').split(' ')[0],
    todaySession,
    planData,
    metrics: {
      weightKg: lastCheckIn?.weightKg ?? user?.profile?.weightKg ?? null,
      weightGoalKg: user?.profile?.weightGoalKg ?? null,
      hrResting: user?.profile?.hrResting ?? null,
      sleepHours: lastCheckIn?.sleepHours ?? user?.profile?.sleepHoursAvg ?? null,
    },
    weekSessions,
    kcalTarget,
    completedCount,
    totalTraining,
    checkinPending,
    trialDaysLeft,
  })
}
