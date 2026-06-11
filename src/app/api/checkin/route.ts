import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import { evaluateAndAdjust, applyPlanAdjustments } from '@/lib/plan/adjustments'
import { calculateTDEE, calculateMacros } from '@/lib/plan/formulas'

interface CheckInBody {
  weightKg?: number
  hrResting?: number
  sleepHours?: number
  sleepScore?: number
  hardestRpe: number
  adherencePct?: number
  hasPain: boolean
  painDescription?: string
  energyLevel: number
  notes?: string
  previousWeightKg?: number
  previousHrResting?: number
}

function evaluateAlerts(data: CheckInBody): string[] {
  const alerts: string[] = []

  if (data.hrResting && data.previousHrResting && data.hrResting > data.previousHrResting * 1.10) {
    alerts.push('FC reposo elevada — considera un dia extra de descanso')
  }
  if (data.sleepScore && data.sleepScore < 70) {
    alerts.push('Sleep score bajo — revisa tus habitos de sueno')
  }
  if (data.weightKg && data.previousWeightKg && (data.previousWeightKg - data.weightKg) > 1.2) {
    alerts.push('Bajaste mas de 1.2kg esta semana — aumenta 200-300 kcal')
  }
  if (data.adherencePct !== undefined && data.adherencePct < 40) {
    alerts.push('Adherencia baja — considera ajustar la carga del plan')
  }

  return alerts
}

function getCurrentWeekNumber(startDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - startDate.getTime()
  return Math.max(1, Math.floor(elapsed / msPerWeek) + 1)
}

function getISOWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil(((now.getTime() - start.getTime()) / msPerWeek) + 1)
}

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const last = await prisma.weeklyCheckIn.findFirst({
    where: { userId: session.user.id },
    orderBy: { recordedAt: 'desc' },
    select: { weightKg: true, hrResting: true },
  })

  return NextResponse.json({
    weightKg: last?.weightKg ?? null,
    hrResting: last?.hrResting ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userId = session.user.id
  const body: CheckInBody = await req.json()

  // Calcular weekNumber desde el plan activo o usar semana ISO del año
  let weekNumber: number

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { weeks: { orderBy: { weekNumber: 'asc' } } },
  })

  if (activePlan) {
    weekNumber = getCurrentWeekNumber(activePlan.startDate)
  } else {
    weekNumber = getISOWeekNumber()
  }

  // Calcular adherencia real desde sesiones del plan (no depender del cliente)
  let calculatedAdherence = body.adherencePct ?? 0
  if (activePlan) {
    const currentWeekNumForAdherence = getCurrentWeekNumber(activePlan.startDate)
    const weekSessions = await prisma.plannedSession.findMany({
      where: {
        week: { planId: activePlan.id, weekNumber: currentWeekNumForAdherence },
        type: { not: 'DESCANSO' },
      },
      select: { log: { select: { id: true } } },
    })
    if (weekSessions.length > 0) {
      const completed = weekSessions.filter(s => !!s.log).length
      calculatedAdherence = Math.round((completed / weekSessions.length) * 100)
    }
  }
  const alerts = evaluateAlerts({ ...body, adherencePct: calculatedAdherence })

  // Obtener contexto del plan para el motor de ajuste — usar la semana actual, no la primera
  const currentWeekNum = activePlan ? getCurrentWeekNumber(activePlan.startDate) : 1
  const currentWeekData = activePlan?.weeks.find((w) => w.weekNumber === currentWeekNum)
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

  // Evaluar ajustes con motor + AI
  const adjustmentResult = await evaluateAndAdjust(
    {
      weightKg: body.weightKg,
      hrResting: body.hrResting,
      hrRestingBaseline: body.previousHrResting ?? undefined,
      sleepHours: body.sleepHours,
      sleepScore: body.sleepScore,
      hardestSessionRpe: body.hardestRpe,
      dietAdherencePct: calculatedAdherence,
      painFlag: body.hasPain,
      energyLevel: body.energyLevel,
      notes: body.notes,
    },
    planContext
  )

  const checkInData = {
    weightKg: body.weightKg,
    hrResting: body.hrResting,
    sleepHours: body.sleepHours,
    sleepScore: body.sleepScore,
    hardestSessionRpe: body.hardestRpe,
    dietAdherencePct: calculatedAdherence,
    painFlag: body.hasPain,
    energyLevel: body.energyLevel,
    notes: body.notes,
    adjustmentsTriggered: adjustmentResult.triggers,
    recordedAt: new Date(),
  }

  await prisma.weeklyCheckIn.upsert({
    where: { userId_weekNumber: { userId, weekNumber } },
    update: { ...checkInData },
    create: { userId, weekNumber, ...checkInData },
  })

  // Aplicar ajustes reales al plan de la semana siguiente si hay triggers
  if (adjustmentResult.triggers.length > 0 && activePlan) {
    const nextWeekNum = currentWeekNum + 1
    if (nextWeekNum <= activePlan.totalWeeks) {
      applyPlanAdjustments(activePlan.id, nextWeekNum, adjustmentResult.triggers).catch((err) =>
        console.error('[checkin] applyPlanAdjustments error:', err)
      )
    }
  }

  // Si el usuario reportó peso, sincronizar con HealthProfile y recalcular TDEE/macros
  if (body.weightKg) {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId },
      select: { weightKg: true, heightCm: true, age: true, gender: true },
    })

    if (profile?.heightCm && profile?.age) {
      const prevWeight = profile.weightKg ?? body.weightKg
      const weightChanged = Math.abs(body.weightKg - prevWeight) >= 0.5 // actualizar si cambió ≥0.5kg

      if (weightChanged) {
        // Actualizar peso en perfil
        await prisma.healthProfile.update({
          where: { userId },
          data: { weightKg: body.weightKg },
        })

        // Recalcular TDEE y macros con el nuevo peso
        const nutritionPlan = await prisma.nutritionPlan.findUnique({ where: { userId } })
        if (nutritionPlan) {
          const tdee = calculateTDEE(body.weightKg, profile.heightCm, profile.age, (profile.gender ?? 'male') as 'male' | 'female', 5)
          const hasWeightGoal = body.weightKg > (body.weightKg - 2) // heurística simple
          const macros = calculateMacros(tdee, body.weightKg, hasWeightGoal)
          await prisma.nutritionPlan.update({
            where: { userId },
            data: {
              tdee,
              targetKcalHard: macros.hard.kcal,
              targetKcalEasy: macros.easy.kcal,
              targetKcalRest: macros.rest.kcal,
              proteinG: macros.hard.protein,
              carbsHardG: macros.hard.carbs,
              carbsEasyG: macros.easy.carbs,
              fatG: macros.hard.fat,
            },
          })
        }
      }
    }
  }

  // Si es el primer check-in, activar features.progress
  const checkInCount = await prisma.weeklyCheckIn.count({ where: { userId } })
  if (checkInCount === 1) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true },
    })
    if (user) {
      const config = parseUserConfig(user.config)
      config.features.progress = true
      await prisma.user.update({
        where: { id: userId },
        data: { config: config as any },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    alerts,
    adjustment: {
      severity: adjustmentResult.severity,
      recommendation: adjustmentResult.recommendation,
      adjustments: adjustmentResult.adjustments,
    },
  })
}
