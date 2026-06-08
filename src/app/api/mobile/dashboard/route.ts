import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

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

  const [user, activePlan, lastCheckIn, lastLog] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, config: true, profile: { select: { weightKg: true, hrResting: true } } },
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
      select: { recordedAt: true, weightKg: true, energyLevel: true },
    }),
    prisma.sessionLog.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }),
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

  // Weekly stats
  let completedCount = 0
  let totalTraining = 0
  let planData = null
  if (activePlan) {
    const currentWeek = getCurrentWeekNumber(activePlan.startDate)
    const week = activePlan.weeks.find(w => w.weekNumber === currentWeek)
    if (week) {
      totalTraining = week.sessions.length
      completedCount = week.sessions.filter(s => s.log).length
    }
    planData = {
      name: activePlan.name,
      currentWeek,
      totalWeeks: activePlan.totalWeeks,
      phase: activePlan.weeks.find(w => w.weekNumber === getCurrentWeekNumber(activePlan.startDate))?.phase ?? 'BASE',
    }
  }

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
      hrResting: user?.profile?.hrResting ?? null,
      sleepHours: null,
    },
    completedCount,
    totalTraining,
    checkinPending,
    trialDaysLeft,
  })
}
