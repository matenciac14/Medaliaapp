/**
 * Use Case: Get Dashboard Summary
 *
 * Pure computation — no DB access, no side effects.
 * Receives raw DB data, returns the dashboard payload + any pending side effects.
 *
 * Side effect signaling:
 *   result.planIdToComplete — if non-null, the route must mark that plan COMPLETED in DB.
 */

import { getPlanWeekNumber } from '@/lib/core/week-number'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'
import { getSessionIntensity } from '@/lib/plan/intensity'
import { parseUserConfig } from '@/lib/config/user-config'
import { jsToOurDow } from '@/lib/core/date-utils'

// ── Input types ───────────────────────────────────────────────────────────────

type SessionLog = { id: string; log: { id: string } | null; type: string; dayOfWeek: number; durationMin: number | null; zoneTarget: string | null; intensity: string | null; detailText: string | null; coachNote?: string | null }
type PlanWeek = { weekNumber: number; phase: string; volumeKm: number | null; sessions: SessionLog[] }
type ActivePlan = { id: string; name: string; startDate: Date; totalWeeks: number; weeks: PlanWeek[] }
type CheckIn = { recordedAt: Date; weightKg: number | null; sleepHours: number | null; energyLevel: number | null; hardestSessionRpe: number | null }
type NutritionPlan = { targetKcalHard: number; targetKcalEasy: number; targetKcalRest: number; proteinG: number; carbsHardG: number; carbsEasyG: number; fatG: number }

export type AssignedWorkoutInput = {
  template: { days: { dayOfWeek: number; isRestDay: boolean }[] }
} | null

export type DashboardInput = {
  user: {
    name: string | null
    config: unknown
    profile: {
      weightKg: number | null
      hrResting: number | null
      weightGoalKg: number | null
      sleepHoursAvg: number | null
      sportDetails: unknown
    } | null
  } | null
  activePlanRaw: ActivePlan | null
  lastCompletedPlan: { name: string; endDate: Date } | null
  checkIns: CheckIn[]
  recentLogs: { completedAt: Date }[]
  nutritionPlan: NutritionPlan | null
  assignedWorkout?: AssignedWorkoutInput
}

export type WeekSessionSlot = {
  dayIndex: number
  type: string | null
  done: boolean
  isToday: boolean
  id: string | null
  durationMin: number | null
  zoneTarget: string | null
}

export type DashboardSummary = {
  firstName: string
  todaySession: {
    id: string
    type: string
    intensity: string | null
    durationMin: number | null
    zoneTarget: string
    detailText: string
    completed: boolean
  } | null
  planData: { name: string; currentWeek: number; totalWeeks: number; phase: string } | null
  metrics: { weightKg: number | null; weightGoalKg: number | null; hrResting: number | null; sleepHours: number | null }
  weekSessions: WeekSessionSlot[]
  nutritionTarget: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } | null
  completedCount: number
  totalTraining: number
  checkinPending: boolean
  streakDays: number
  raceDays: number | null
  isRecomp: boolean
  formStatus: 'good' | 'moderate' | 'rest'
  formMessage: string
  lastCheckIn: { energyLevel: number | null; hardestSessionRpe: number | null; sleepHours: number | null } | null
  weeklyWeightChange: number | null
  weightProgressPct: number | null
  currentVolume: number | null
  volumeDeltaPct: number | null
  mode: 'TRAINING' | 'RECOVERY' | 'FREE'
  recoveryDaysLeft: number | null
  completedPlanName: string | null
}

export type DashboardResult = {
  summary: DashboardSummary
  planIdToComplete: string | null  // route must mark this plan COMPLETED if non-null
}

// ── Use case ──────────────────────────────────────────────────────────────────

export function getDashboardSummary(input: DashboardInput): DashboardResult {
  const { user, activePlanRaw, lastCompletedPlan, checkIns, recentLogs, nutritionPlan, assignedWorkout } = input
  const todayDow = jsToOurDow(new Date().getDay())
  const weekAgo = new Date(); weekAgo.setHours(0, 0, 0, 0); weekAgo.setDate(weekAgo.getDate() - 7)

  // ── Plan lifecycle ────────────────────────────────────────────────
  let planIdToComplete: string | null = null
  let activePlan: ActivePlan | null = activePlanRaw
  let completedPlanName: string | null = null
  let completedPlanEndDate: Date | null = null

  if (activePlan) {
    const endDate = new Date(activePlan.startDate)
    endDate.setDate(endDate.getDate() + activePlan.totalWeeks * 7)
    const rawWeek = Math.floor((Date.now() - new Date(activePlan.startDate).getTime()) / 86400000 / 7) + 1
    if (rawWeek > activePlan.totalWeeks && Date.now() > endDate.getTime()) {
      planIdToComplete = activePlan.id
      completedPlanName = activePlan.name
      completedPlanEndDate = endDate
      activePlan = null
    }
  }

  if (!activePlan && !completedPlanName && lastCompletedPlan?.endDate) {
    completedPlanName = lastCompletedPlan.name
    completedPlanEndDate = new Date(lastCompletedPlan.endDate)
  }

  const recoveryDaysSinceEnd = completedPlanEndDate
    ? Math.floor((Date.now() - completedPlanEndDate.getTime()) / 86400000) : null
  const recoveryDaysLeft = recoveryDaysSinceEnd !== null ? Math.max(0, 14 - recoveryDaysSinceEnd) : null
  const mode: 'TRAINING' | 'RECOVERY' | 'FREE' = activePlan
    ? 'TRAINING'
    : recoveryDaysSinceEnd !== null && recoveryDaysSinceEnd <= 14 ? 'RECOVERY' : 'FREE'

  // ── Check-ins ─────────────────────────────────────────────────────
  const lastCheckIn = checkIns[0] ?? null
  const prevCheckIn = checkIns[1] ?? null

  // ── Today's session ───────────────────────────────────────────────
  let todaySession: DashboardSummary['todaySession'] = null
  if (activePlan) {
    const currentWeek = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    const week = activePlan.weeks.find(w => w.weekNumber === currentWeek)
    const session = week?.sessions.find(s => s.dayOfWeek === todayDow)
    if (session && session.type !== 'DESCANSO') {
      todaySession = {
        id: session.id,
        type: session.type,
        intensity: session.intensity ?? null,
        durationMin: session.durationMin,
        zoneTarget: session.zoneTarget ?? '2',
        detailText: session.detailText ?? session.coachNote ?? '',
        completed: !!session.log,
      }
    }
  } else if (assignedWorkout) {
    const todayGymDay = assignedWorkout.template.days.find(d => d.dayOfWeek === todayDow)
    if (todayGymDay && !todayGymDay.isRestDay) {
      todaySession = {
        id: 'gym-today',
        type: 'FUERZA',
        intensity: 'MODERATE',
        durationMin: 60,
        zoneTarget: '',
        detailText: '',
        completed: false,
      }
    }
  }

  // ── Weekly strip ──────────────────────────────────────────────────
  let completedCount = 0
  let totalTraining = 0
  let planData: DashboardSummary['planData'] = null
  const weekSessions: WeekSessionSlot[] = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i, type: null, done: false, isToday: i + 1 === todayDow, id: null, durationMin: null, zoneTarget: null,
  }))

  if (activePlan) {
    const currentWeek = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    const week = activePlan.weeks.find(w => w.weekNumber === currentWeek)
    if (week) {
      totalTraining = week.sessions.length
      completedCount = week.sessions.filter(s => s.log).length
      for (const s of week.sessions) {
        const idx = s.dayOfWeek - 1
        if (idx >= 0 && idx < 7) {
          weekSessions[idx].type = s.type
          weekSessions[idx].done = !!s.log
          weekSessions[idx].id = s.id
          weekSessions[idx].durationMin = s.durationMin
          weekSessions[idx].zoneTarget = s.zoneTarget ?? '2'
        }
      }
      planData = { name: activePlan.name, currentWeek, totalWeeks: activePlan.totalWeeks, phase: week.phase }
    }
  }

  // ── GYM users: populate weekSessions from assignedWorkout ────────
  if (!activePlan && assignedWorkout) {
    for (const day of assignedWorkout.template.days) {
      const idx = day.dayOfWeek - 1  // our DOW 1=Mon → index 0
      if (idx >= 0 && idx < 7) {
        weekSessions[idx].type = day.isRestDay ? 'DESCANSO' : 'FUERZA'
        weekSessions[idx].done = false
        weekSessions[idx].durationMin = day.isRestDay ? null : 60
        if (!day.isRestDay) totalTraining++
      }
    }
  }

  // ── Nutrition target ──────────────────────────────────────────────
  const intensity = (todaySession?.intensity as 'HIGH' | 'MODERATE' | 'LOW' | null)
    ?? (todaySession?.type ? getSessionIntensity(todaySession.type) : null)
  const nt = nutritionPlan ? getDailyNutritionTarget(intensity, nutritionPlan) : null
  const nutritionTarget = nt ? { kcal: nt.kcal, proteinG: nt.proteinG, carbsG: nt.carbsG, fatG: nt.fatG, label: nt.label } : null

  // ── Config ────────────────────────────────────────────────────────
  const config = parseUserConfig(user?.config)

  // ── Streak ────────────────────────────────────────────────────────
  const logDateSet = new Set(recentLogs.map(l => new Date(l.completedAt).toDateString()))
  let streakDays = 0
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  for (let i = 0; i <= 59; i++) {
    const d = new Date(todayMidnight); d.setDate(d.getDate() - i)
    if (logDateSet.has(d.toDateString())) streakDays++
    else break
  }

  // ── Race / recomp ─────────────────────────────────────────────────
  const sportDetails = user?.profile?.sportDetails as Record<string, unknown> | null
  const raceDateStr = sportDetails?.raceDate as string | undefined
  const raceDays = raceDateStr ? Math.ceil((new Date(raceDateStr).getTime() - Date.now()) / 86400000) : null
  const isRecomp = !!(
    config.sport?.goal?.includes('BODY') ||
    activePlan?.name?.toLowerCase().includes('recomp') ||
    activePlan?.name?.toLowerCase().includes('body')
  )

  // ── Form status ───────────────────────────────────────────────────
  let formStatus: 'good' | 'moderate' | 'rest' = 'good'
  let formMessage = 'Sin datos de check-in'
  if (lastCheckIn) {
    const energy = lastCheckIn.energyLevel ?? 3
    const rpe = lastCheckIn.hardestSessionRpe ?? 5
    const sleep = (lastCheckIn.sleepHours ?? 7) >= 6.5
    if (energy >= 4 && rpe <= 7 && sleep) { formStatus = 'good'; formMessage = 'Listo para entrenar fuerte' }
    else if (energy >= 3 && rpe <= 8) { formStatus = 'moderate'; formMessage = 'Carga moderada recomendada' }
    else { formStatus = 'rest'; formMessage = 'Prioriza la recuperación hoy' }
  }

  // ── Weight progress ───────────────────────────────────────────────
  const currentWeight = lastCheckIn?.weightKg ?? user?.profile?.weightKg ?? null
  const targetWeight = user?.profile?.weightGoalKg ?? null
  const startWeight = user?.profile?.weightKg ?? null
  let weeklyWeightChange: number | null = null
  if (lastCheckIn?.weightKg && prevCheckIn?.weightKg) {
    const daysDiff = Math.max(1,
      (new Date(lastCheckIn.recordedAt).getTime() - new Date(prevCheckIn.recordedAt).getTime()) / 86400000
    )
    weeklyWeightChange = Math.round(((lastCheckIn.weightKg - prevCheckIn.weightKg) / daysDiff) * 7 * 10) / 10
  }
  let weightProgressPct: number | null = null
  if (currentWeight && targetWeight && startWeight && startWeight !== targetWeight) {
    weightProgressPct = Math.min(100, Math.max(0,
      Math.round(((startWeight - currentWeight) / (startWeight - targetWeight)) * 100)
    ))
  }

  // ── Weekly volume ─────────────────────────────────────────────────
  let currentVolume: number | null = null
  let volumeDeltaPct: number | null = null
  if (activePlan) {
    const currentWeekNum = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
    const currentWeekData = activePlan.weeks.find(w => w.weekNumber === currentWeekNum)
    const prevWeekData = activePlan.weeks.find(w => w.weekNumber === currentWeekNum - 1)
    currentVolume = currentWeekData?.volumeKm ?? null
    const prevVolume = prevWeekData?.volumeKm ?? null
    if (currentVolume && prevVolume) {
      volumeDeltaPct = Math.round(((currentVolume - prevVolume) / prevVolume) * 100)
    }
  }

  return {
    planIdToComplete,
    summary: {
      firstName: (user?.name ?? 'Atleta').split(' ')[0],
      todaySession,
      planData,
      metrics: {
        weightKg: currentWeight,
        weightGoalKg: targetWeight,
        hrResting: user?.profile?.hrResting ?? null,
        sleepHours: lastCheckIn?.sleepHours ?? user?.profile?.sleepHoursAvg ?? null,
      },
      weekSessions,
      nutritionTarget,
      completedCount,
      totalTraining,
      checkinPending: !lastCheckIn || lastCheckIn.recordedAt < weekAgo,
      streakDays,
      raceDays,
      isRecomp,
      formStatus,
      formMessage,
      lastCheckIn: lastCheckIn ? {
        energyLevel: lastCheckIn.energyLevel,
        hardestSessionRpe: lastCheckIn.hardestSessionRpe,
        sleepHours: lastCheckIn.sleepHours,
      } : null,
      weeklyWeightChange,
      weightProgressPct,
      currentVolume,
      volumeDeltaPct,
      mode,
      recoveryDaysLeft,
      completedPlanName,
    },
  }
}
