import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import ProgressClient, {
  type WeightPoint,
  type HrPoint,
  type WeekData,
  type WellbeingPoint,
  type BenchmarkPoint,
  type GymPR,
  type HistoryItem,
  type MeasurementPoint,
} from './_components/ProgressClient'

// Adherencia real: sesiones con log / sesiones planificadas
function calcAdherencePct(
  sessions: { log: { id: string } | null }[]
): number {
  if (sessions.length === 0) return 0
  const completed = sessions.filter((s) => s.log !== null).length
  return Math.round((completed / sessions.length) * 100)
}

export default async function ProgressPage() {
  const session = await auth()

  if (!session?.user?.id) return null

  if (!session.user.features?.progress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <span className="text-5xl">📊</span>
        <h2 className="text-xl font-bold text-[#1e3a5f]">Progreso disponible en Pro</h2>
        <p className="text-gray-500 text-sm max-w-xs">Visualiza tu evolución de peso, FC y adherencia semana a semana con el plan Pro.</p>
        <a href="/upgrade" className="mt-2 inline-block rounded-xl bg-[#ea580c] text-white px-6 py-3 text-sm font-semibold hover:bg-[#ea6c0a] transition-colors">Ver planes → Pro $15/mes</a>
      </div>
    )
  }

  // ── Fetch check-ins ──────────────────────────────────────────────────────
  const rawCheckIns = await prisma.weeklyCheckIn.findMany({
    where: { userId: session.user.id },
    orderBy: { weekNumber: 'asc' },
    select: {
      weekNumber: true,
      weightKg: true,
      hrResting: true,
      energyLevel: true,
      stressLevel: true,
      motivationLevel: true,
      recordedAt: true,
      waistCm: true,
      armsCm: true,
      hipsCm: true,
      thighsCm: true,
    },
  })

  // ── Fetch plan activo con semanas y sesiones ─────────────────────────────
  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: session.user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: {
            include: { log: true },
          },
        },
      },
    },
  })

  // ── Peso del objetivo (perfil) ───────────────────────────────────────────
  const [profile, gymSessionsCount, rawBenchmarks, rawGymPRs, rawSessionLogs, rawGymSessions] = await Promise.all([
    prisma.healthProfile.findUnique({
      where: { userId: session.user.id },
      select: { weightGoalKg: true },
    }),
    prisma.gymSession.count({
      where: { athleteId: session.user.id, completed: true },
    }),
    prisma.performanceBenchmark.findMany({
      where: { userId: session.user.id },
      orderBy: { testedAt: 'desc' },
      select: { id: true, sport: true, metric: true, value: true, unit: true, testedAt: true, notes: true },
    }),
    prisma.setLog.findMany({
      where: {
        isPR: true,
        session: { athleteId: session.user.id, completed: true },
      },
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
    prisma.sessionLog.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        completedAt: true,
        durationMin: true,
        distanceKm: true,
        rpe: true,
        plannedSession: { select: { type: true } },
      },
    }),
    prisma.gymSession.findMany({
      where: { athleteId: session.user.id, completed: true },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        id: true,
        date: true,
        durationMin: true,
        rpe: true,
        assignedWorkout: { select: { template: { select: { name: true } } } },
        plannedSession: { select: { workoutDay: { select: { label: true } } } },
      },
    }),
  ])

  const weightGoal = profile?.weightGoalKg ?? null

  const RUN_TYPE_LABELS: Record<string, string> = {
    RODAJE_Z2: 'Rodaje Z2', FARTLEK: 'Fartlek', TEMPO: 'Tempo',
    INTERVALOS: 'Intervalos', TIRADA_LARGA: 'Tirada larga', OTRO: 'Sesión libre', DESCANSO: 'Descanso',
    FUERZA: 'Fuerza', TEST: 'Test', SIMULACRO: 'Simulacro',
  }

  const runItems: HistoryItem[] = rawSessionLogs.map(sl => ({
    id: `run-${sl.id}`,
    date: sl.completedAt.toISOString(),
    type: 'run' as const,
    label: sl.plannedSession?.type ? (RUN_TYPE_LABELS[sl.plannedSession.type] ?? sl.plannedSession.type) : 'Sesión libre',
    durationMin: sl.durationMin ?? null,
    distanceKm: sl.distanceKm ?? null,
    rpe: sl.rpe ?? null,
  }))

  const gymItems: HistoryItem[] = rawGymSessions.map(gs => ({
    id: `gym-${gs.id}`,
    date: gs.date.toISOString(),
    type: 'gym' as const,
    label: gs.plannedSession?.workoutDay?.label ?? gs.assignedWorkout?.template.name ?? 'Sesión de gym',
    durationMin: gs.durationMin ?? null,
    rpe: gs.rpe ?? null,
  }))

  const recentActivity: HistoryItem[] = [...runItems, ...gymItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)

  const benchmarks: BenchmarkPoint[] = rawBenchmarks.map(b => ({
    ...b,
    testedAt: b.testedAt.toISOString(),
  }))

  const gymPRs: GymPR[] = rawGymPRs.map(r => ({
    id: r.id,
    exerciseName: r.exerciseName ?? 'Ejercicio',
    weightKg: r.weightKg,
    repsCompleted: r.repsCompleted,
    date: r.session.date.toISOString(),
  }))

  // ── Construir arrays de datos ────────────────────────────────────────────

  const weightCheckins: WeightPoint[] = rawCheckIns
    .filter((c): c is typeof c & { weightKg: number } => c.weightKg !== null)
    .map((c) => ({ week: c.weekNumber, kg: c.weightKg }))

  const hrCheckins: HrPoint[] = rawCheckIns
    .filter((c): c is typeof c & { hrResting: number } => c.hrResting !== null)
    .map((c) => ({ week: c.weekNumber, bpm: c.hrResting }))

  const wellbeingData: WellbeingPoint[] = rawCheckIns
    .filter((c) => c.energyLevel != null || c.stressLevel != null || c.motivationLevel != null)
    .map((c) => ({
      week: c.weekNumber,
      energyLevel: c.energyLevel ?? null,
      stressLevel: c.stressLevel ?? null,
      motivationLevel: c.motivationLevel ?? null,
    }))

  const measurementCheckins: MeasurementPoint[] = rawCheckIns
    .filter((c) => c.waistCm != null || c.armsCm != null || c.hipsCm != null || c.thighsCm != null)
    .map((c) => ({
      week: c.weekNumber,
      waistCm: c.waistCm ?? null,
      armsCm: c.armsCm ?? null,
      hipsCm: c.hipsCm ?? null,
      thighsCm: c.thighsCm ?? null,
    }))

  const weeks: WeekData[] = plan
    ? plan.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        phase: w.phase as string,
        volumeKm: w.volumeKm ?? 0,
        adherencePct: calcAdherencePct(w.sessions),
      }))
    : []

  // ── Sin datos: estado vacío honesto ─────────────────────────────────────
  if (weightCheckins.length === 0 && hrCheckins.length === 0 && weeks.length === 0) {
    const hasGymSessions = gymSessionsCount > 0
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <span className="text-5xl">{hasGymSessions ? '💪' : '📈'}</span>
        <h2 className="text-xl font-bold text-[#1e3a5f]">
          {hasGymSessions ? `${gymSessionsCount} sesiones de ejercicios completadas` : 'Aún no hay datos de progreso'}
        </h2>
        <p className="text-gray-500 text-sm max-w-xs">
          {hasGymSessions
            ? 'Haz tu primer check-in semanal para empezar a ver tu evolución de peso y FC aquí.'
            : 'Haz tu primer check-in semanal y completa sesiones para ver tu evolución aquí.'}
        </p>
        <div className="flex gap-3 mt-2 flex-wrap justify-center">
          <a href="/checkin" className="inline-block rounded-xl bg-[#ea580c] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#ea6c0a] transition-colors">Hacer check-in →</a>
          {hasGymSessions
            ? <a href="/gym/history" className="inline-block rounded-xl border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Ver historial ejercicios</a>
            : <a href="/plan" className="inline-block rounded-xl border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Ver mi plan</a>
          }
        </div>
      </div>
    )
  }

  return (
    <ProgressClient
      weightCheckins={weightCheckins}
      hrCheckins={hrCheckins}
      wellbeingData={wellbeingData}
      weeks={weeks}
      weightGoal={weightGoal}
      benchmarks={benchmarks}
      gymPRs={gymPRs}
      recentActivity={recentActivity}
      measurementCheckins={measurementCheckins}
    />
  )
}
