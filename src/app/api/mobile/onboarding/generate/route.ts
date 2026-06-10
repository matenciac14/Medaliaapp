import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken } from '@/lib/mobile-auth'
import { generatePlan } from '@/lib/plan/generator'
import { rateLimit } from '@/lib/rate-limit'
import { calculateTDEE, calculateMacros, estimateHRMax } from '@/lib/plan/formulas'
import { parseUserConfig } from '@/lib/config/user-config'
import type { WizardData } from '@/app/onboarding/_types'

function timeStringToSecs(timeStr: string | null): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

function resolveGoalType(data: WizardData): string {
  if (data.mainGoal === 'SPORT') {
    switch (data.sport) {
      case 'RUNNING': return data.raceDistance ?? 'RACE_HALF_MARATHON'
      case 'CYCLING': return 'RACE_CYCLING'
      case 'TRIATHLON': return 'RACE_TRIATHLON'
      default: return 'BODY_RECOMPOSITION'
    }
  }
  if (data.mainGoal === 'GYM' || data.mainGoal === 'BODY') return 'BODY_RECOMPOSITION'
  return 'GENERAL_FITNESS'
}

function buildSportDetails(data: WizardData): Record<string, unknown> {
  if (data.mainGoal === 'SPORT') {
    switch (data.sport) {
      case 'RUNNING': return { raceDistance: data.raceDistance, raceDate: data.raceDate, targetTime: data.targetTime, recentBestTime: data.recentBestTime }
      case 'CYCLING': return { cyclingModality: data.cyclingModality, hasPowerMeter: data.hasPowerMeter, ftp: data.ftp, raceDate: data.raceDate }
      case 'SWIMMING': return { swimStroke: data.swimStroke, recentSwimTime: data.recentSwimTime, raceDate: data.raceDate }
      case 'TRIATHLON': return { triathlonDistance: data.triathlonDistance, weakestSegment: data.weakestSegment, raceDate: data.raceDate }
      case 'FOOTBALL': return { footballPosition: data.footballPosition, competitionLevel: data.competitionLevel, seasonPhase: data.seasonPhase }
      case 'STRENGTH': return { strengthStyle: data.strengthStyle }
    }
  }
  if (data.mainGoal === 'GYM') return { gymGoal: data.gymGoal }
  if (data.mainGoal === 'BODY') return { bodyGoal: data.bodyGoal, targetDate: data.raceDate }
  return {}
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { allowed } = rateLimit(`onboarding-mobile:${ip}`, { limit: 3, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  try {
    const data: WizardData = await req.json()
    const userId = mobile.id

    if (!data.age || !data.weightKg || !data.heightCm) {
      return NextResponse.json({ error: 'Faltan datos del perfil (edad, peso o talla).' }, { status: 400 })
    }

    // ── GYM path ──────────────────────────────────────────────────────────────
    if (data.mainGoal === 'GYM') {
      const tdee = calculateTDEE(data.weightKg!, data.heightCm!, data.age!, data.gender ?? 'male', data.daysPerWeek)
      const macros = calculateMacros(tdee, data.weightKg!, !!data.weightGoalKg)

      await prisma.nutritionPlan.upsert({
        where: { userId },
        create: { userId, tdee, targetKcalHard: macros.hard.kcal, targetKcalEasy: macros.easy.kcal, targetKcalRest: macros.rest.kcal, proteinG: macros.hard.protein, carbsHardG: macros.hard.carbs, carbsEasyG: macros.easy.carbs, fatG: macros.hard.fat },
        update: { tdee, targetKcalHard: macros.hard.kcal, targetKcalEasy: macros.easy.kcal, targetKcalRest: macros.rest.kcal, proteinG: macros.hard.protein, carbsHardG: macros.hard.carbs, carbsEasyG: macros.easy.carbs, fatG: macros.hard.fat },
      })

      const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { config: true } })
      const currentConfig = parseUserConfig(existingUser?.config)
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await prisma.user.update({
        where: { id: userId },
        data: {
          config: {
            ...currentConfig,
            features: { ...currentConfig.features, plan: true, nutrition: true, progress: true, log: true, checkin: true, gym: true, aiCoach: true },
            onboarding: { completed: true, completedAt: new Date().toISOString() },
            sport: { type: 'STRENGTH', goal: 'BODY_RECOMPOSITION' },
            trial: { plan: 'TRIAL', endsAt: trialEndsAt },
            ai: { ...currentConfig.ai, monthlyLimit: 999999 },
          } as object,
        },
      })

      await prisma.healthProfile.upsert({
        where: { userId },
        create: { userId, age: data.age!, heightCm: data.heightCm!, weightKg: data.weightKg!, weightGoalKg: data.weightGoalKg ?? undefined, gender: data.gender ?? 'male', sport: 'GYM', sportDetails: { gymGoal: data.gymGoal } as object, dataSources: {} as object },
        update: { age: data.age!, heightCm: data.heightCm!, weightKg: data.weightKg!, weightGoalKg: data.weightGoalKg ?? undefined, gender: data.gender ?? 'male', sport: 'GYM', sportDetails: { gymGoal: data.gymGoal } as object },
      })

      const token = await signMobileToken({ id: userId, email: mobile.email, name: mobile.name, role: mobile.role, onboardingCompleted: true, userPlan: 'TRIAL' })
      return NextResponse.json({ success: true, isB2B: false, planId: null, token })
    }

    const goalType = resolveGoalType(data)
    const sportDetails = buildSportDetails(data)

    const coachRelation = await prisma.coachAthlete.findFirst({ where: { athleteId: userId } })
    const isB2B = !!coachRelation

    await prisma.healthProfile.upsert({
      where: { userId },
      create: {
        userId, age: data.age, heightCm: data.heightCm, weightKg: data.weightKg, weightGoalKg: data.weightGoalKg ?? undefined,
        gender: data.gender ?? 'male', hrResting: data.hrResting ?? undefined, hrMax: data.hrMax ?? undefined, ftp: data.ftp ?? undefined,
        injuries: data.injuries, conditions: data.conditions,
        sport: data.mainGoal === 'SPORT' ? (data.sport ?? undefined) : 'STRENGTH',
        experienceLevel: data.experienceLevel ?? undefined, sportDetails: sportDetails as object,
        dataSources: { hrMax: { source: data.hrSource === 'known' ? 'manual' : 'estimated', updatedAt: new Date().toISOString() } } as object,
      },
      update: {
        age: data.age, heightCm: data.heightCm, weightKg: data.weightKg, weightGoalKg: data.weightGoalKg ?? undefined,
        gender: data.gender ?? 'male', hrResting: data.hrResting ?? undefined, hrMax: data.hrMax ?? undefined, ftp: data.ftp ?? undefined,
        injuries: data.injuries, conditions: data.conditions,
        sport: data.mainGoal === 'SPORT' ? (data.sport ?? undefined) : 'STRENGTH',
        experienceLevel: data.experienceLevel ?? undefined, sportDetails: sportDetails as object,
        dataSources: { hrMax: { source: data.hrSource === 'known' ? 'manual' : 'estimated', updatedAt: new Date().toISOString() } } as object,
      },
    })

    if (isB2B) {
      const existingB2B = await prisma.user.findUnique({ where: { id: userId }, select: { config: true } })
      const b2bConfig = parseUserConfig(existingB2B?.config)
      await prisma.user.update({
        where: { id: userId },
        data: { config: { ...b2bConfig, onboarding: { completed: true, completedAt: new Date().toISOString() }, sport: { type: goalType, goal: goalType } } as object },
      })
      const token = await signMobileToken({ id: userId, email: mobile.email, name: mobile.name, role: mobile.role, onboardingCompleted: true, userPlan: mobile.userPlan })
      return NextResponse.json({ success: true, isB2B: true, planId: null, token })
    }

    const result = await generatePlan({
      userId, goalType, generatedBy: 'AI',
      raceDate: data.raceDate ?? undefined, targetTimeSecs: timeStringToSecs(data.targetTime) ?? undefined,
      weightGoalKg: data.weightGoalKg ?? undefined, age: data.age, heightCm: data.heightCm, weightKg: data.weightKg,
      gender: data.gender ?? 'male', hrResting: data.hrResting ?? undefined, hrMax: data.hrMax ?? undefined,
      daysPerWeek: data.daysPerWeek, hoursPerSession: data.hoursPerSession, injuries: data.injuries, conditions: data.conditions,
      nutritionCommitment: data.nutritionCommitment ?? 'moderate', weekSchedule: data.weekSchedule ?? undefined,
      experienceLevel: data.experienceLevel ?? undefined,
    })

    const token = await signMobileToken({ id: userId, email: mobile.email, name: mobile.name, role: mobile.role, onboardingCompleted: true, userPlan: 'TRIAL' })
    return NextResponse.json({ success: true, isB2B, planId: result.planId, token })
  } catch (error) {
    console.error('[mobile/onboarding/generate]', error)
    return NextResponse.json({ error: 'Error generando el plan. Intenta de nuevo.' }, { status: 500 })
  }
}
