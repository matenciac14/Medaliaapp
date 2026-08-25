import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { PlanStatus } from '@/generated/prisma/enums'
import { redirect } from 'next/navigation'
import PlanClient, { type PlanClientPlan, type PlanClientWeek } from './_components/PlanClient'
import PlanEmptyClient from './_components/PlanEmptyClient'
import PlanCompletedClient from './_components/PlanCompletedClient'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'
import { getSessionIntensity } from '@/lib/plan/intensity'
import { selectActivePlan } from '@/lib/plan/active-plan'
import { getPlanWeekNumber } from '@/lib/core/week-number'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default async function PlanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  if (!session.user.features?.plan) {
    // JWT may be stale post-onboarding — verify DB before showing empty state
    const hasActivePlan = await prisma.trainingPlan.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' },
      select: { id: true },
    })

    if (!hasActivePlan) {
      const healthProfile = await prisma.healthProfile.findUnique({
        where: { userId: session.user.id },
        select: { sport: true },
      })

      const isRunner = healthProfile?.sport === 'RUNNING' || healthProfile?.sport === 'BOTH'

      return <PlanEmptyClient isB2B={session.user.isB2B ?? false} showGymBuilder={!isRunner} />
    }
  }

  const userId = session.user.id

  let plan: PlanClientPlan | null = null
  let weeks: PlanClientWeek[] = []
  let nutritionTarget: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } | null = null
  let weightData: { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null } | null = null
  let profileData: { weightKg: number | null; weightGoalKg: number | null; sport: string | null } | null = null

  try {
    const [activePlansData, nutritionPlanData, profileDataRaw, checkIns, oldestCheckIn] = await Promise.all([
      prisma.trainingPlan.findMany({
        where: { userId, status: 'ACTIVE' },
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
      }),
      prisma.nutritionPlan.findUnique({ where: { userId } }),
      prisma.healthProfile.findUnique({
        where: { userId },
        select: { weightKg: true, weightGoalKg: true, sport: true },
      }),
      prisma.weeklyCheckIn.findMany({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
        take: 2,
        select: { recordedAt: true, weightKg: true },
      }),
      prisma.weeklyCheckIn.findFirst({
        where: { userId, weightKg: { not: null } },
        orderBy: { recordedAt: 'asc' },
        select: { weightKg: true },
      }),
    ])

    profileData = profileDataRaw ?? null

    // Seleccionar el plan con más logs; desactivar duplicados en background
    const { winner: activePlanData, loserIds: _planLoserIds } = selectActivePlan(activePlansData)
    if (_planLoserIds.length > 0) {
      await prisma.trainingPlan.updateMany({
        where: { id: { in: _planLoserIds } },
        data: { status: PlanStatus.COMPLETED },
      }).catch(() => {})
    }

    if (activePlanData) {
      const currentWeek = getPlanWeekNumber(activePlanData.startDate, activePlanData.totalWeeks)

      // Today's session for nutrition intensity
      const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay() // 1=Mon..7=Sun
      const currentWeekData = activePlanData.weeks.find(w => w.weekNumber === currentWeek)
      const todaySession = currentWeekData?.sessions.find(s => s.dayOfWeek === todayDow)
      // Prefer stored intensity field (set by generator.ts); fall back to derived value
      const todayIntensity = (todaySession?.intensity as 'HIGH' | 'MODERATE' | 'LOW' | null) ?? (todaySession?.type ? getSessionIntensity(todaySession.type) : null)

      if (nutritionPlanData) {
        const nt = getDailyNutritionTarget(todayIntensity, {
          targetKcalHard: nutritionPlanData.targetKcalHard,
          targetKcalEasy: nutritionPlanData.targetKcalEasy,
          targetKcalRest: nutritionPlanData.targetKcalRest,
          proteinG: nutritionPlanData.proteinG,
          carbsHardG: nutritionPlanData.carbsHardG,
          carbsEasyG: nutritionPlanData.carbsEasyG,
          fatG: nutritionPlanData.fatG,
        })
        nutritionTarget = { kcal: nt.kcal, proteinG: nt.proteinG, carbsG: nt.carbsG, fatG: nt.fatG, label: nt.label }
      }

      if (profileData?.weightKg) {
        const curr = profileData.weightKg
        const goal = profileData.weightGoalKg ?? null
        const startWeight = oldestCheckIn?.weightKg ?? null
        let progressPct: number | null = null
        if (startWeight && goal && startWeight !== goal) {
          progressPct = Math.min(100, Math.max(0,
            Math.round(((startWeight - curr) / (startWeight - goal)) * 100)
          ))
        }
        let weeklyChange: number | null = null
        if (checkIns.length >= 2 && checkIns[0].weightKg && checkIns[1].weightKg) {
          const daysDiff = Math.max(1,
            (new Date(checkIns[0].recordedAt).getTime() - new Date(checkIns[1].recordedAt).getTime()) / 86400000
          )
          weeklyChange = Math.round(((checkIns[0].weightKg - checkIns[1].weightKg) / daysDiff) * 7 * 10) / 10
        }
        weightData = { currentKg: curr, goalKg: goal, progressPct, weeklyChange }
      }

      plan = {
        name: activePlanData.name,
        currentWeek,
        totalWeeks: activePlanData.totalWeeks,
        startDate: activePlanData.startDate.toISOString().split('T')[0],
      }

      weeks = activePlanData.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        phase: w.phase,
        volumeKm: w.volumeKm ?? 0,
        isRecoveryWeek: w.isRecoveryWeek,
        hasTest: w.sessions.some((s) => s.type === 'TEST' || s.type === 'SIMULACRO'),
        focusDescription: w.focusDescription ?? '',
        sessions: w.sessions.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          day: DAY_LABELS[s.dayOfWeek % 7] ?? String(s.dayOfWeek),
          type: s.type,
          label: s.detailText?.slice(0, 40) ?? s.type,
          done: !!s.log,
          durationMin: s.durationMin,
          zoneTarget: s.zoneTarget ?? '',
          detailText: s.detailText ?? '',
          structure: s.structure ?? null,
          intensity: (s.intensity as string) ?? null,
          logId: s.log?.id ?? null,
          logDurationMin: s.log?.durationMin ?? null,
          logRpe: s.log?.rpe ?? null,
          logHrAvg: s.log?.hrAvg ?? null,
          logNotes: s.log?.notes ?? null,
          logDistanceKm: s.log?.distanceKm ?? null,
        })),
      }))
    }
  } catch (err) {
    console.error('[plan] Error cargando plan:', err)
  }

  if (!plan) {
    const isB2B = session.user.isB2B ?? false
    const planPageIsRunner = profileData?.sport === 'RUNNING' || profileData?.sport === 'BOTH'

    // Buscar último plan completado para mostrar celebración
    const lastCompleted = await prisma.trainingPlan.findFirst({
      where: { userId: session.user.id, status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      select: {
        endDate: true, name: true, totalWeeks: true,
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: {
            weekNumber: true, phase: true,
            sessions: {
              orderBy: { dayOfWeek: 'asc' },
              select: {
                dayOfWeek: true, type: true, detailText: true,
                durationMin: true, zoneTarget: true,
                log: { select: { id: true } },
              },
            },
          },
        },
      },
    }).catch(() => null)

    if (lastCompleted) {
      const allSessions = lastCompleted.weeks.flatMap(w => w.sessions)
      const sessionsLogged = allSessions.filter(s => s.log).length
      const recoveryDaysSinceEnd = Math.floor(
        (Date.now() - new Date(lastCompleted.endDate).getTime()) / 86_400_000
      )
      const completedAdherencePct = allSessions.length > 0
        ? Math.round((sessionsLogged / allSessions.length) * 100)
        : 0

      // Last week's sessions for the CalendarStrip
      const lastWeek = lastCompleted.weeks[lastCompleted.weeks.length - 1]
      const lastWeekSessions = (lastWeek?.sessions ?? []).map(s => ({
        dayOfWeek: s.dayOfWeek,
        type: s.type,
        label: s.detailText?.slice(0, 25) ?? s.type,
        durationMin: s.durationMin,
        zone: s.zoneTarget ?? '',
        done: !!s.log,
      }))

      // Phase progression
      const phases = lastCompleted.weeks.map(w => w.phase).filter(Boolean) as string[]
      const uniquePhases = [...new Set(phases)]

      return (
        <PlanCompletedClient
          isB2B={isB2B}
          planName={lastCompleted.name}
          totalWeeks={lastCompleted.totalWeeks}
          sessionsLogged={sessionsLogged}
          sessionsTotal={allSessions.length}
          recoveryDaysSinceEnd={recoveryDaysSinceEnd}
          completedAdherencePct={completedAdherencePct}
          lastWeekSessions={lastWeekSessions}
          phases={uniquePhases}
          currentWeek={lastCompleted.totalWeeks}
        />
      )
    }

    return <PlanEmptyClient isB2B={isB2B} showGymBuilder={!planPageIsRunner} />
  }

  return (
    <PlanClient plan={plan} weeks={weeks} nutritionTarget={nutritionTarget} weightData={weightData} />
  )
}
