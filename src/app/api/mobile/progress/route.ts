import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

function adherencePct(sessions: { log: { id: string } | null }[]): number {
  if (sessions.length === 0) return 0
  return Math.round((sessions.filter(s => s.log !== null).length / sessions.length) * 100)
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = mobile.id

  const [checkIns, plan, profile, gymCount] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { weekNumber: 'asc' },
      select: { weekNumber: true, weightKg: true, hrResting: true, recordedAt: true },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: { sessions: { include: { log: true } } },
        },
      },
    }),
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightGoalKg: true },
    }),
    prisma.gymSession.count({ where: { athleteId: userId, completed: true } }),
  ])

  const weightPoints = checkIns
    .filter(c => c.weightKg !== null)
    .map(c => ({ week: c.weekNumber, kg: c.weightKg as number }))

  const hrPoints = checkIns
    .filter(c => c.hrResting !== null)
    .map(c => ({ week: c.weekNumber, bpm: c.hrResting as number }))

  const weeks = plan?.weeks.map(w => ({
    weekNumber: w.weekNumber,
    phase: w.phase,
    adherencePct: adherencePct(w.sessions),
  })) ?? []

  const totalSessions = checkIns.length
  const overallAdherence = weeks.length > 0
    ? Math.round(weeks.reduce((acc, w) => acc + w.adherencePct, 0) / weeks.length)
    : 0

  return NextResponse.json({
    weightPoints,
    hrPoints,
    weeks,
    weightGoal: profile?.weightGoalKg ?? null,
    gymSessionsCompleted: gymCount,
    totalCheckIns: totalSessions,
    overallAdherencePct: overallAdherence,
  })
}
