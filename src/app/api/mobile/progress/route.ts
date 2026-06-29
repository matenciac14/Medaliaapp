import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { requireFeature } from '@/lib/guards/feature-gate'
import { rateLimitAsync } from '@/lib/rate-limit'

function adherencePct(sessions: { log: { id: string } | null }[]): number {
  if (sessions.length === 0) return 0
  return Math.round((sessions.filter(s => s.log !== null).length / sessions.length) * 100)
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:progress`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'progress')
  if (featureGuard) return featureGuard

  const userId = mobile.id

  const [checkIns, plan, profile, gymCount] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where: { userId },
      orderBy: { weekNumber: 'asc' },
      select: {
        weekNumber: true,
        weightKg: true,
        hrResting: true,
        energyLevel: true,
        stressLevel: true,
        motivationLevel: true,
        sleepHours: true,
        recordedAt: true,
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: { sessions: { where: { date: { lte: new Date() } }, include: { log: true } } },
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

  const wellbeingPoints = checkIns
    .filter(c => c.energyLevel !== null || c.stressLevel !== null || c.motivationLevel !== null)
    .map(c => ({
      week: c.weekNumber,
      energyLevel: c.energyLevel ?? null,
      stressLevel: c.stressLevel ?? null,
      motivationLevel: c.motivationLevel ?? null,
      sleepHours: c.sleepHours ?? null,
    }))

  const weeks = plan?.weeks.map(w => ({
    weekNumber: w.weekNumber,
    phase: w.phase,
    adherencePct: adherencePct(w.sessions),
  })) ?? []

  const totalSessions = checkIns.length
  // Solo promediar semanas con sesiones pasadas — semanas futuras (0 sesiones) no deben arrastrar el promedio
  const weeksWithPastSessions = plan?.weeks.filter(w => w.sessions.length > 0) ?? []
  const overallAdherence = weeksWithPastSessions.length > 0
    ? Math.round(weeksWithPastSessions.reduce((acc, w) => acc + adherencePct(w.sessions), 0) / weeksWithPastSessions.length)
    : 0

  return NextResponse.json({
    weightPoints,
    hrPoints,
    wellbeingPoints,
    weeks,
    weightGoal: profile?.weightGoalKg ?? null,
    gymSessionsCompleted: gymCount,
    totalCheckIns: totalSessions,
    overallAdherencePct: overallAdherence,
  })
}
