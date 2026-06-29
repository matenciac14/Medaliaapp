import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import ProgressClient, {
  type WeightPoint,
  type HrPoint,
  type WeekData,
  type WellbeingPoint,
  type BenchmarkPoint,
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
        <a href="/upgrade" className="mt-2 inline-block rounded-xl bg-[#f97316] text-white px-6 py-3 text-sm font-semibold hover:bg-[#ea6c0a] transition-colors">Ver planes → Pro $15/mes</a>
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
  const [profile, gymSessionsCount, rawBenchmarks] = await Promise.all([
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
  ])

  const weightGoal = profile?.weightGoalKg ?? null

  const benchmarks: BenchmarkPoint[] = rawBenchmarks.map(b => ({
    ...b,
    testedAt: b.testedAt.toISOString(),
  }))

  // ── Construir arrays de datos ────────────────────────────────────────────

  const weightCheckins: WeightPoint[] = rawCheckIns
    .filter((c) => c.weightKg !== null)
    .map((c) => ({ week: c.weekNumber, kg: c.weightKg as number }))

  const hrCheckins: HrPoint[] = rawCheckIns
    .filter((c) => c.hrResting !== null)
    .map((c) => ({ week: c.weekNumber, bpm: c.hrResting as number }))

  const wellbeingData: WellbeingPoint[] = rawCheckIns
    .filter((c) => c.energyLevel != null || c.stressLevel != null || c.motivationLevel != null)
    .map((c) => ({
      week: c.weekNumber,
      energyLevel: c.energyLevel ?? null,
      stressLevel: c.stressLevel ?? null,
      motivationLevel: c.motivationLevel ?? null,
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
          {hasGymSessions ? `${gymSessionsCount} sesiones de gym completadas` : 'Aún no hay datos de progreso'}
        </h2>
        <p className="text-gray-500 text-sm max-w-xs">
          {hasGymSessions
            ? 'Haz tu primer check-in semanal para empezar a ver tu evolución de peso y FC aquí.'
            : 'Haz tu primer check-in semanal y completa sesiones para ver tu evolución aquí.'}
        </p>
        <div className="flex gap-3 mt-2 flex-wrap justify-center">
          <a href="/checkin" className="inline-block rounded-xl bg-[#f97316] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#ea6c0a] transition-colors">Hacer check-in →</a>
          {hasGymSessions
            ? <a href="/gym/history" className="inline-block rounded-xl border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Ver historial gym</a>
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
      weightGoal={weightGoal ?? 0}
      benchmarks={benchmarks}
    />
  )
}
