import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { PlanStatus } from '@/generated/prisma/enums'
import { redirect } from 'next/navigation'
import PlanClient, { type PlanClientPlan, type PlanClientWeek } from './_components/PlanClient'
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
      // GYM user with assigned workout → redirect to gym module
      const gymRoutine = await prisma.assignedWorkout.findFirst({
        where: { athleteId: session.user.id, isActive: true },
        select: { id: true },
      })
      if (gymRoutine) redirect('/gym')

      // Sin plan activo — modo libre
      return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Estás en modo libre</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Podés registrar tus entrenamientos sin un plan estructurado. Activá el plan Pro para obtener un plan periodizado según tu deporte y metas.
          </p>
          <a
            href="/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Activar plan Pro → $15/mes
          </a>
        </div>
      </div>
      )
    }
  }

  const userId = session.user.id

  let plan: PlanClientPlan | null = null
  let weeks: PlanClientWeek[] = []
  let nutritionTarget: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } | null = null
  let weightData: { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null } | null = null

  try {
    const [activePlansData, nutritionPlanData, profileData, checkIns, oldestCheckIn] = await Promise.all([
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
        select: { weightKg: true, weightGoalKg: true },
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
    const isB2B = session.user.isB2B
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sin plan activo</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            {isB2B
              ? 'Tu coach aún no ha asignado un plan de entrenamiento.'
              : 'Aún no tienes un plan activo. Genera uno nuevo para empezar.'}
          </p>
          <a
            href={isB2B ? '/dashboard' : '/new-goal'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#f97316' }}
          >
            {isB2B ? 'Volver al inicio →' : 'Generar mi plan →'}
          </a>
        </div>
      </div>
    )
  }

  return <PlanClient plan={plan} weeks={weeks} nutritionTarget={nutritionTarget} weightData={weightData} />
}
