import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { generatePlan } from '@/lib/plan/generator'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json()
  const { goalType, raceDate } = body as { goalType: string; raceDate?: string }
  if (!goalType) return NextResponse.json({ error: 'goalType requerido' }, { status: 400 })

  const profile = await prisma.healthProfile.findUnique({ where: { userId } })
  if (!profile?.age || !profile?.weightKg || !profile?.heightCm) {
    return NextResponse.json({ error: 'Perfil físico incompleto. Completa el onboarding primero.' }, { status: 400 })
  }

  try {
    // generatedBy: 'COACH' → PlanSource.COACH en DB (plan de plantilla, no AI).
    // El use case ya escribe plan.{currentWeek,totalWeeks,phase} en Phase 3.
    // Solo necesitamos activar las features de training sin tocar el tier existente.
    const result = await generatePlan({
      userId,
      goalType,
      generatedBy: 'COACH',
      raceDate: raceDate ?? undefined,
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      gender: (profile.gender ?? 'male') as 'male' | 'female',
      hrResting: profile.hrResting ?? undefined,
      hrMax: profile.hrMax ?? undefined,
      daysPerWeek: 4,
      hoursPerSession: 1,
      injuries: (profile.injuries as string[]) ?? [],
      conditions: (profile.conditions as string[]) ?? [],
      nutritionCommitment: 'moderate',
      experienceLevel: profile.experienceLevel ?? undefined,
    })

    // Activar features de training atómicamente — sin read-modify-write
    await new PrismaUserRepository().enableFeatures(userId, ['plan', 'checkin', 'log'])

    return NextResponse.json({ success: true, planId: result.planId })
  } catch (err) {
    console.error('[plan/new]', err)
    return NextResponse.json({ error: 'Error generando plan' }, { status: 500 })
  }
}
