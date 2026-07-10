import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { PlanStatus } from '@/generated/prisma/enums'
import { redirect } from 'next/navigation'
import PlanClient, { type PlanClientPlan, type PlanClientWeek } from './_components/PlanClient'
import PlanCalendarView from './_components/PlanCalendarView'
import PlanCompletionCard from '../_components/PlanCompletionCard'
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
      const [gymRoutine, healthProfile] = await Promise.all([
        prisma.assignedWorkout.findFirst({
          where: { athleteId: session.user.id, isActive: true },
          select: { id: true },
        }),
        prisma.healthProfile.findUnique({
          where: { userId: session.user.id },
          select: { sport: true },
        }),
      ])
      if (gymRoutine) redirect('/gym')

      const isRunner = healthProfile?.sport === 'RUNNING' || healthProfile?.sport === 'BOTH'

      // Sin plan activo — sin coach asignado
      return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
          <div className="text-5xl">{isRunner ? '🏃' : '🎯'}</div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Todavía no tenés un plan activo
            </h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              {isRunner
                ? 'Un entrenador te diseña un plan periodizado con zonas Karvonen, nutrición ajustada por sesión y seguimiento semanal.'
                : 'Un entrenador te asigna un plan de fuerza o composición corporal adaptado a tus objetivos y seguimiento personalizado.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-left">
            {[
              { icon: '📊', label: 'Plan a medida', desc: 'Diseñado para tu fisiología y objetivos' },
              { icon: '❤️', label: 'Seguimiento real', desc: 'Tu coach ajusta el plan cada semana' },
              { icon: '💬', label: 'Comunicación directa', desc: 'Notas y feedback por sesión' },
            ].map((f) => (
              <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xl mb-1">{f.icon}</p>
                <p className="text-xs font-semibold text-gray-800">{f.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="/coaches"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Encontrar mi entrenador →
            </a>
            <a href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Volver al dashboard
            </a>
          </div>
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
    const isB2B = session.user.isB2B ?? false

    // Buscar último plan completado para mostrar celebración en lugar de pantalla vacía
    const lastCompleted = await prisma.trainingPlan.findFirst({
      where: { userId: session.user.id, status: 'COMPLETED' },
      orderBy: { endDate: 'desc' },
      select: {
        endDate: true, name: true, totalWeeks: true,
        weeks: { select: { sessions: { select: { log: { select: { id: true } } } } } },
      },
    }).catch(() => null)

    if (lastCompleted) {
      const allSessions = lastCompleted.weeks.flatMap(w => w.sessions)
      const sessionsLogged = allSessions.filter(s => s.log).length
      const recoveryDaysSinceEnd = Math.floor(
        (Date.now() - new Date(lastCompleted.endDate).getTime()) / 86_400_000
      )
      return (
        <div className="px-4 py-6 md:px-8 md:py-8 max-w-md mx-auto space-y-4">
          <PlanCompletionCard
            planName={lastCompleted.name}
            totalWeeks={lastCompleted.totalWeeks}
            sessionsLogged={sessionsLogged}
            sessionsTotal={allSessions.length}
            recoveryDaysSinceEnd={recoveryDaysSinceEnd}
            isB2B={isB2B}
          />
        </div>
      )
    }

    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sin plan activo</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            {isB2B
              ? 'Tu coach aún no ha asignado un plan de entrenamiento.'
              : 'Empieza a entrenar o consigue un plan personalizado con un entrenador.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="/log"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Registrar sesión libre →
            </a>
            {!isB2B && (
              <a
                href="/coaches"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Buscar entrenador
              </a>
            )}
            {isB2B && (
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Volver al inicio
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-6">
      {/* ARCH-03: Vista calendario como navegación principal */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Calendario</h2>
        <PlanCalendarView />
      </div>

      {/* Vista semanal detallada (detalle del plan) */}
      <PlanClient plan={plan} weeks={weeks} nutritionTarget={nutritionTarget} weightData={weightData} />
    </div>
  )
}
