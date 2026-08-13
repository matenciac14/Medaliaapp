import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { generatePlan } from '@/lib/plan/generator'
import { PLAN_TEMPLATES } from '@/lib/plan/templates'

const VALID_GOAL_TYPES = Object.keys(PLAN_TEMPLATES)
const VALID_DAYS_PER_WEEK = [3, 4, 5, 6] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id: athleteId } = await params
  const coachId = session.user.id

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Asesorado no encontrado.' }, { status: 404 })
  }

  const body = await req.json()
  const { goalType, daysPerWeek, hoursPerSession } = body

  if (!goalType) {
    return NextResponse.json({ error: 'goalType es requerido.' }, { status: 400 })
  }
  if (!VALID_GOAL_TYPES.includes(goalType)) {
    return NextResponse.json({ error: `goalType inválido. Válidos: ${VALID_GOAL_TYPES.join(', ')}` }, { status: 400 })
  }
  if (daysPerWeek !== undefined && !VALID_DAYS_PER_WEEK.includes(daysPerWeek)) {
    return NextResponse.json({ error: 'daysPerWeek debe ser 3, 4, 5 o 6.' }, { status: 400 })
  }
  if (hoursPerSession !== undefined && (typeof hoursPerSession !== 'number' || hoursPerSession < 0.5 || hoursPerSession > 3)) {
    return NextResponse.json({ error: 'hoursPerSession debe estar entre 0.5 y 3.' }, { status: 400 })
  }

  // Load athlete health profile for plan generation
  const athlete = await prisma.user.findUnique({
    where: { id: athleteId },
    include: { profile: true },
  })

  const profile = athlete?.profile

  if (!profile) {
    return NextResponse.json(
      { error: 'El atleta no tiene perfil físico. Completa el onboarding antes de generar un plan.' },
      { status: 400 }
    )
  }

  // Look for a recent 5K benchmark to calibrate pace hints in running sessions
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const benchmark5K = await prisma.performanceBenchmark.findFirst({
    where: {
      userId: athleteId,
      sport: 'RUNNING',
      metric: '5K_TIME',
      testedAt: { gte: ninetyDaysAgo },
    },
    orderBy: { testedAt: 'desc' },
    select: { value: true },
  })

  const result = await generatePlan({
    userId: athleteId,
    goalType,
    daysPerWeek: daysPerWeek ?? 4,
    hoursPerSession: hoursPerSession ?? 1,
    age: profile.age ?? 30,
    heightCm: profile.heightCm ?? 170,
    weightKg: profile.weightKg ?? 70,
    gender: (profile.gender ?? 'male') as 'male' | 'female',
    hrResting: profile.hrResting ?? undefined,
    hrMax: profile.hrMax ?? undefined,
    injuries: (profile?.injuries as string[]) ?? [],
    conditions: (profile?.conditions as string[]) ?? [],
    nutritionCommitment: 'moderate',
    weightGoalKg: profile?.weightGoalKg ?? undefined,
    generatedBy: 'COACH',
    recentBenchmark5KSecs: benchmark5K ? Number(benchmark5K.value) : undefined,
  })

  return NextResponse.json({ success: true, planId: result.planId })
}
