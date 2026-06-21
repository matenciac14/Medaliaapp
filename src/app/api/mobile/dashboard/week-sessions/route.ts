import { NextRequest, NextResponse } from 'next/server'
import { jsToOurDow, MONTHS } from '@/lib/core/date-utils'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { getPlanWeekNumber } from '@/lib/core/week-number'

function formatWeekLabel(startDate: Date, endDate: Date): string {
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDate.getDate()}–${endDate.getDate()} ${MONTHS[startDate.getMonth()]}`
  }
  return `${startDate.getDate()} ${MONTHS[startDate.getMonth()]} – ${endDate.getDate()} ${MONTHS[endDate.getMonth()]}`
}


export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = mobile.id
  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0') || 0
  const todayDow = jsToOurDow(new Date().getDay())

  const [activePlan, assignedWorkout] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
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
    prisma.assignedWorkout.findFirst({
      where: { athleteId: userId, isActive: true },
      select: { template: { select: { days: { select: { dayOfWeek: true, isRestDay: true } } } } },
    }),
  ])

  if (!activePlan) {
    // GYM user: return recurring weekly schedule from assignedWorkout
    const gymSessions = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i, type: null as string | null, done: false,
      isToday: weekOffset === 0 && i + 1 === todayDow,
      id: null as string | null, durationMin: null as number | null, zoneTarget: null as string | null,
    }))
    let gymTotal = 0
    if (assignedWorkout) {
      for (const day of assignedWorkout.template.days) {
        const idx = day.dayOfWeek - 1
        if (idx >= 0 && idx < 7 && !day.isRestDay) {
          gymSessions[idx].type = 'FUERZA'
          gymSessions[idx].durationMin = 60
          gymTotal++
        }
      }
    }
    return NextResponse.json({
      weekSessions: gymSessions,
      completedCount: 0,
      totalTraining: gymTotal,
      weekLabel: null,
      weekOffset,
      isCurrentWeek: weekOffset === 0,
    })
  }

  const currentWeek = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
  const selectedWeekNum = currentWeek + weekOffset
  const selectedWeek = activePlan.weeks.find(w => w.weekNumber === selectedWeekNum) ?? null

  const weekSessions: {
    dayIndex: number
    type: string | null
    done: boolean
    isToday: boolean
    id: string | null
    durationMin: number | null
    zoneTarget: string | null
  }[] = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i, type: null, done: false,
    isToday: weekOffset === 0 && i + 1 === todayDow,
    id: null, durationMin: null, zoneTarget: null,
  }))

  let completedCount = 0
  let totalTraining = 0
  let weekLabel: string | null = null

  if (selectedWeek) {
    totalTraining = selectedWeek.sessions.length
    completedCount = selectedWeek.sessions.filter(s => s.log).length
    for (const s of selectedWeek.sessions) {
      const idx = s.dayOfWeek - 1
      if (idx >= 0 && idx < 7) {
        weekSessions[idx].type = s.type
        weekSessions[idx].done = !!s.log
        weekSessions[idx].id = s.id
        weekSessions[idx].durationMin = s.durationMin
        weekSessions[idx].zoneTarget = s.zoneTarget ?? '2'
      }
    }
    weekLabel = formatWeekLabel(selectedWeek.startDate, selectedWeek.endDate)
  }

  return NextResponse.json({
    weekSessions,
    completedCount,
    totalTraining,
    weekLabel,
    weekOffset,
    isCurrentWeek: weekOffset === 0,
  })
}
