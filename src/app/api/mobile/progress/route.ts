import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { requireFeature } from '@/lib/guards/feature-gate'
import { rateLimitAsync } from '@/lib/rate-limit'
import { calcAdherencePct } from '@/lib/core/adherence'

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:progress`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })
  const featureGuard = requireFeature(mobile.features, 'progress')
  if (featureGuard) return featureGuard

  const userId = mobile.id

  const [checkIns, plan, profile, gymCount, rawGymSessions, rawBenchmarks, rawGymPRs, rawSetHistory] = await Promise.all([
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
        dietAdherencePct: true,
        waistCm: true,
        armsCm: true,
        hipsCm: true,
        thighsCm: true,
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: {
            weekNumber: true,
            phase: true,
            sessions: {
              where: { date: { lte: new Date() } },
              select: { log: { select: { id: true, distanceKm: true } } },
            },
          },
        },
      },
    }),
    prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightGoalKg: true },
    }),
    prisma.gymSession.count({ where: { athleteId: userId, completed: true } }),
    prisma.gymSession.findMany({
      where: { athleteId: userId, completed: true },
      select: { date: true },
      orderBy: { date: 'asc' },
    }),
    prisma.performanceBenchmark.findMany({
      where: { userId },
      orderBy: { testedAt: 'desc' },
      select: { id: true, sport: true, metric: true, value: true, unit: true, testedAt: true, notes: true },
    }),
    prisma.setLog.findMany({
      where: { isPR: true, session: { athleteId: userId, completed: true } },
      orderBy: { session: { date: 'desc' } },
      take: 20,
      select: {
        id: true,
        exerciseName: true,
        weightKg: true,
        repsCompleted: true,
        session: { select: { date: true } },
      },
    }),
    // MOB-PROG-01: histórico de sets para curva 1RM por ejercicio (Epley)
    prisma.setLog.findMany({
      where: {
        session: { athleteId: userId, completed: true },
        weightKg: { not: null },
        repsCompleted: { gte: 1, lte: 15 },
      },
      select: {
        exerciseName: true,
        weightKg: true,
        repsCompleted: true,
        session: { select: { date: true } },
      },
      orderBy: { session: { date: 'desc' } },
      take: 600,
    }),
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

  const measurementPoints = checkIns
    .filter(c => c.waistCm !== null || c.armsCm !== null || c.hipsCm !== null || c.thighsCm !== null)
    .map(c => ({
      week: c.weekNumber,
      waistCm: c.waistCm ?? null,
      armsCm: c.armsCm ?? null,
      hipsCm: c.hipsCm ?? null,
      thighsCm: c.thighsCm ?? null,
    }))

  const weeks = plan?.weeks.map(w => {
    // BUG-061: usar dietAdherencePct del check-in si existe — más confiable que contar PlannedSession.log
    // (el log solo se crea via /log/run, no via gym tracker ni sesiones libres)
    const checkIn = checkIns.find(c => c.weekNumber === w.weekNumber)
    return {
      weekNumber: w.weekNumber,
      phase: w.phase,
      adherencePct: checkIn?.dietAdherencePct ?? calcAdherencePct(w.sessions.filter(s => s.log !== null).length, w.sessions.length),
      volumeKm: w.sessions.reduce((acc, s) => acc + (s.log?.distanceKm ?? 0), 0),
    }
  }) ?? []

  // Gym adherence by ISO week (last 8 weeks with activity)
  const gymByWeek = new Map<string, number>()
  for (const s of rawGymSessions) {
    if (!s.date) continue
    const d = s.date
    const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
    const monday = new Date(d)
    monday.setUTCDate(d.getUTCDate() - dow + 1)
    const key = monday.toISOString().split('T')[0]
    gymByWeek.set(key, (gymByWeek.get(key) ?? 0) + 1)
  }
  const benchmarks = rawBenchmarks.map(b => ({
    ...b,
    testedAt: b.testedAt.toISOString(),
  }))

  // MOB-PROG-01: curva histórica 1RM — Epley formula, mejor por día, top 5 ejercicios
  const epley = (kg: number, reps: number) => Math.round(kg * (1 + reps / 30) * 10) / 10
  const historyMap = new Map<string, Map<string, number>>()
  for (const sl of rawSetHistory) {
    if (!sl.exerciseName || !sl.weightKg || !sl.repsCompleted) continue
    const dateKey = sl.session.date.toISOString().split('T')[0]
    const oneRm = epley(sl.weightKg, sl.repsCompleted)
    const exMap = historyMap.get(sl.exerciseName) ?? new Map<string, number>()
    if ((exMap.get(dateKey) ?? 0) < oneRm) exMap.set(dateKey, oneRm)
    historyMap.set(sl.exerciseName, exMap)
  }
  const gymPRHistory = [...historyMap.entries()]
    .map(([exerciseName, dateMap]) => ({
      exerciseName,
      points: [...dateMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, oneRmKg]) => ({ date, oneRmKg })),
    }))
    .filter(s => s.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, 5)

  const gymPRs = rawGymPRs.map(r => ({
    id: r.id,
    exerciseName: r.exerciseName ?? 'Ejercicio',
    weightKg: r.weightKg,
    repsCompleted: r.repsCompleted,
    date: r.session.date.toISOString(),
  }))

  const gymAdherenceByWeek = [...gymByWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([weekLabel, sessions]) => ({ weekLabel, sessions }))

  const totalSessions = checkIns.length
  // Solo promediar semanas con sesiones pasadas — semanas futuras (0 sesiones) no deben arrastrar el promedio
  const weeksWithPastSessions = plan?.weeks.filter(w => w.sessions.length > 0) ?? []
  const overallAdherence = weeksWithPastSessions.length > 0
    ? Math.round(weeksWithPastSessions.reduce((acc, w) => acc + calcAdherencePct(w.sessions.filter(s => s.log !== null).length, w.sessions.length), 0) / weeksWithPastSessions.length)
    : 0

  return NextResponse.json({
    weightPoints,
    hrPoints,
    wellbeingPoints,
    measurementPoints,
    weeks,
    weightGoal: profile?.weightGoalKg ?? null,
    gymSessionsCompleted: gymCount,
    gymAdherenceByWeek,
    benchmarks,
    gymPRs,
    gymPRHistory,
    totalCheckIns: totalSessions,
    overallAdherencePct: overallAdherence,
  })
}
