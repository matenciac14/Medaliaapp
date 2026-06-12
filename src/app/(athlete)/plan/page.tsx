import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import PlanClient, { type PlanClientPlan, type PlanClientWeek } from './_components/PlanClient'
import { getDailyNutritionTarget } from '@/lib/nutrition/daily-target'

function typeToIntensity(type: string | null): 'HIGH' | 'MODERATE' | 'LOW' | null {
  if (!type) return null
  if (['FARTLEK', 'TIRADA_LARGA'].includes(type)) return 'HIGH'
  if (['RODAJE_Z2', 'CICLA', 'NATACION', 'FUERZA'].includes(type)) return 'MODERATE'
  return 'LOW'
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default async function PlanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  if (!session.user.features?.plan) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Plan de entrenamiento</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            El plan adaptativo con periodización y sesiones semanales está disponible en el plan Pro.
          </p>
          <a
            href="/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Ver planes → Pro $15/mes
          </a>
        </div>
      </div>
    )
  }

  const userId = session.user.id

  let plan: PlanClientPlan | null = null
  let weeks: PlanClientWeek[] = []
  let nutritionTarget: { kcal: number; proteinG: number; carbsG: number; fatG: number; label: string } | null = null
  let weightData: { currentKg: number | null; goalKg: number | null; progressPct: number | null; weeklyChange: number | null } | null = null

  try {
    const [activePlanData, nutritionPlanData, profileData, checkIns] = await Promise.all([
      prisma.trainingPlan.findFirst({
        where: { userId, status: 'ACTIVE' },
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
    ])

    if (activePlanData) {
      const now = new Date()
      const start = new Date(activePlanData.startDate)
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const currentWeek = Math.max(1, Math.min(activePlanData.totalWeeks, Math.floor(diffDays / 7) + 1))

      // Today's session for nutrition intensity
      const todayDow = now.getDay() === 0 ? 7 : now.getDay() // 1=Mon..7=Sun
      const currentWeekData = activePlanData.weeks.find(w => w.weekNumber === currentWeek)
      const todaySession = currentWeekData?.sessions.find(s => s.dayOfWeek === todayDow)
      const todayIntensity = typeToIntensity(todaySession?.type ?? null)

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
        // Progress: how much of the gap to goal has been covered, using profile weight as starting point
        // Since we don't store startWeight, show pct as (curr - goal) / (curr - goal) scaled — show null if data is insufficient
        const progressPct: number | null = null // requires historical start weight; shown as bar disabled
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
          day: DAY_LABELS[s.dayOfWeek] ?? String(s.dayOfWeek),
          type: s.type,
          label: s.detailText?.slice(0, 40) ?? s.type,
          done: !!s.log,
          durationMin: s.durationMin,
          zoneTarget: s.zoneTarget ?? '',
          detailText: s.detailText ?? '',
          intensity: (s.intensity as string) ?? null,
          logId: s.log?.id ?? null,
          logDurationMin: s.log?.durationMin ?? null,
          logRpe: s.log?.rpe ?? null,
          logHrAvg: s.log?.hrAvg ?? null,
          logNotes: s.log?.notes ?? null,
        })),
      }))
    }
  } catch (err) {
    console.error('[plan] Error cargando plan:', err)
  }

  if (!plan) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sin plan activo</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Aún no tienes un plan de entrenamiento. Completa el onboarding o contacta a tu coach para generarlo.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Volver al dashboard
          </a>
        </div>
      </div>
    )
  }

  return <PlanClient plan={plan} weeks={weeks} nutritionTarget={nutritionTarget} weightData={weightData} />
}
