import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

function getCurrentWeekNumber(startDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.max(1, Math.floor((Date.now() - startDate.getTime()) / msPerWeek) + 1)
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: mobile.id, status: 'ACTIVE' },
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

  if (!plan) return NextResponse.json(null)

  const currentWeek = getCurrentWeekNumber(plan.startDate)

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
        sportLabel: (s as any).sportLabel ?? null,
        detailText: (s as any).detailText ?? null,
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
