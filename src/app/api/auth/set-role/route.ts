import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { role } = await req.json()
  if (role !== 'ATHLETE' && role !== 'COACH') {
    return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
  }

  const isCoach = role === 'COACH'
  const now = new Date()

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role,
      needsRoleSelection: false,
      ...(isCoach ? {
        featurePlan:      false,
        featureCheckin:   false,
        featureNutrition: false,
        featureProgress:  false,
        featureLog:       false,
        featureCoach:     true,
        featureGym:       false,
        onboardingCompleted:   true,
        onboardingCompletedAt: now,
      } : {
        // Athlete: defaults de columnas son correctos
      }),
    },
  })

  return NextResponse.json({ ok: true, role })
}
