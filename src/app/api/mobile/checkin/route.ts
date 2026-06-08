import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { evaluateAndAdjust, applyPlanAdjustments } from '@/lib/plan/adjustments'

function getCurrentWeekNumber(startDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.max(1, Math.floor((Date.now() - startDate.getTime()) / msPerWeek) + 1)
}

function getISOWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = mobile.id
  const body = await req.json() as {
    energyLevel: number
    muscleSoreness: number
    stressLevel: number
    weightKg?: number
    sleepHours?: number
    notes?: string
  }

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { weeks: { orderBy: { weekNumber: 'asc' } } },
  })

  const weekNumber = activePlan ? getCurrentWeekNumber(activePlan.startDate) : getISOWeekNumber()
  const currentWeekNum = activePlan ? getCurrentWeekNumber(activePlan.startDate) : 1
  const currentWeekData = activePlan?.weeks.find(w => w.weekNumber === currentWeekNum)
    ?? activePlan?.weeks[activePlan.weeks.length - 1]

  const planContext = activePlan
    ? {
        currentWeek: currentWeekNum,
        totalWeeks: activePlan.totalWeeks,
        phase: currentWeekData?.phase ?? 'BASE',
        weeklyVolumeKm: currentWeekData?.volumeKm ?? undefined,
        isRecoveryWeek: currentWeekData?.isRecoveryWeek ?? false,
      }
    : { currentWeek: 1, totalWeeks: 18, phase: 'BASE' }

  // Mapear campos mobile → motor de ajuste
  // muscleSoreness 1-5 → hardestRpe 1-10 (×2)
  // stressLevel 1-5 → hasPain si >=4
  const hardestRpe = body.muscleSoreness * 2
  const hasPain = body.stressLevel >= 4

  const adjustmentResult = await evaluateAndAdjust(
    {
      weightKg: body.weightKg,
      sleepHours: body.sleepHours,
      hardestSessionRpe: hardestRpe,
      dietAdherencePct: 80, // mobile no pide adherencia — default 80
      painFlag: hasPain,
      energyLevel: body.energyLevel,
      notes: body.notes,
    },
    planContext
  )

  await prisma.weeklyCheckIn.upsert({
    where: { userId_weekNumber: { userId, weekNumber } },
    update: {
      weightKg: body.weightKg,
      sleepHours: body.sleepHours,
      energyLevel: body.energyLevel,
      hardestSessionRpe: hardestRpe,
      painFlag: hasPain,
      notes: body.notes,
      adjustmentsTriggered: adjustmentResult.triggers,
      recordedAt: new Date(),
    },
    create: {
      userId,
      weekNumber,
      weightKg: body.weightKg,
      sleepHours: body.sleepHours,
      energyLevel: body.energyLevel,
      hardestSessionRpe: hardestRpe,
      dietAdherencePct: 80,
      painFlag: hasPain,
      notes: body.notes,
      adjustmentsTriggered: adjustmentResult.triggers,
      recordedAt: new Date(),
    },
  })

  if (adjustmentResult.triggers.length > 0 && activePlan) {
    const nextWeekNum = currentWeekNum + 1
    if (nextWeekNum <= activePlan.totalWeeks) {
      applyPlanAdjustments(activePlan.id, nextWeekNum, adjustmentResult.triggers).catch(err =>
        console.error('[mobile/checkin] applyPlanAdjustments:', err)
      )
    }
  }

  return NextResponse.json({
    ok: true,
    adjustment: {
      severity: adjustmentResult.severity,
      recommendation: adjustmentResult.recommendation,
    },
  })
}
