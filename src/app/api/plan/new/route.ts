import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { generatePlan } from '@/lib/plan/generator'
import { parseUserConfig } from '@/lib/config/user-config'

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
    // COACH para saltarse la lógica de trial — el usuario ya tiene su tier activo
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

    // Leer el plan recién creado para obtener totalWeeks y fase inicial
    const newPlan = await prisma.trainingPlan.findUnique({
      where: { id: result.planId },
      select: {
        totalWeeks: true,
        weeks: { take: 1, orderBy: { weekNumber: 'asc' }, select: { phase: true } },
      },
    })

    // Activar features.plan sin tocar el tier de trial existente
    const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { config: true } })
    const currentConfig = parseUserConfig(existingUser?.config)

    await prisma.user.update({
      where: { id: userId },
      data: {
        config: {
          ...currentConfig,
          features: { ...currentConfig.features, plan: true, checkin: true, log: true },
          plan: {
            activePlanId: result.planId,
            currentWeek: 1,
            totalWeeks: newPlan?.totalWeeks ?? 0,
            phase: (newPlan?.weeks[0]?.phase ?? 'BASE') as any,
          },
        } as object,
      },
    })

    return NextResponse.json({ success: true, planId: result.planId })
  } catch (err) {
    console.error('[plan/new]', err)
    return NextResponse.json({ error: 'Error generando plan' }, { status: 500 })
  }
}
