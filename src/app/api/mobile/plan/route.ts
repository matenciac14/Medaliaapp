import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { getPlanWeekNumber } from '@/lib/core/week-number'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:plan`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: mobile.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            orderBy: { dayOfWeek: 'asc' },
            include: { log: true },
          },
        },
      },
    },
  })

  if (!plan) {
    const lastCompleted = await prisma.trainingPlan.findFirst({
      where: { userId: mobile.id, status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      select: {
        name: true,
        totalWeeks: true,
        endDate: true,
        weeks: { select: { sessions: { select: { log: { select: { id: true } } } } } },
      },
    })
    if (!lastCompleted) return NextResponse.json(null)
    const allSessions = lastCompleted.weeks.flatMap(w => w.sessions)
    return NextResponse.json({
      lastCompletedPlan: {
        name: lastCompleted.name,
        totalWeeks: lastCompleted.totalWeeks,
        endDate: lastCompleted.endDate?.toISOString() ?? null,
        sessionsLogged: allSessions.filter(s => s.log).length,
        sessionsTotal: allSessions.length,
      },
    })
  }

  const currentWeek = getPlanWeekNumber(plan.startDate, plan.totalWeeks)

  return NextResponse.json({
    id: plan.id,
    name: plan.name,
    currentWeek,
    totalWeeks: plan.totalWeeks,
    weeks: plan.weeks.map(w => ({
      id: w.id,
      weekNumber: w.weekNumber,
      phase: w.phase,
      sessions: w.sessions.map(s => ({
        id: s.id,
        type: s.type,
        durationMin: s.durationMin,
        zoneTarget: s.zoneTarget ?? '',
        dayOfWeek: s.dayOfWeek,
        coachNote: s.coachNote ?? null,
        detailText: s.detailText ?? null,
        structure: s.structure ?? null,
        intensity: s.intensity ?? null,
        completed: !!s.log,
        log: s.log ? {
          id: s.log.id,
          durationMin: s.log.durationMin ?? null,
          rpe: s.log.rpe ?? null,
          hrAvg: s.log.hrAvg ?? null,
          notes: s.log.notes ?? null,
        } : null,
      })),
    })),
  })
}
