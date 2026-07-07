import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { roleSchema, parseBody } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:set-role`, { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(z.object({ role: roleSchema }), raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { role } = parsed.data

  const isCoach = role === 'COACH'
  const now = new Date()

  const updatedUser = await prisma.user.update({
    where: { id: mobile.id },
    data: {
      role,
      needsRoleSelection: false,
      // Coach: onboarding marcado como completado, solo feature coach activa
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
        // Athlete: defaults (all features=true) son correctos ya en columnas
      }),
    },
    select: {
      id: true, email: true, name: true, role: true, status: true,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
      onboardingCompleted: true,
    },
  })

  const features = {
    plan:      updatedUser.featurePlan,
    checkin:   updatedUser.featureCheckin,
    nutrition: updatedUser.featureNutrition,
    progress:  updatedUser.featureProgress,
    log:       updatedUser.featureLog,
    coach:     updatedUser.featureCoach,
    gym:       updatedUser.featureGym,
  }

  const token = await signMobileToken({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name ?? '',
    role: updatedUser.role,
    status: updatedUser.status,
    onboardingCompleted: updatedUser.onboardingCompleted,
    userPlan: 'PRO',
    features,
  })

  return NextResponse.json({
    token,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      onboardingCompleted: updatedUser.onboardingCompleted,
      userPlan: 'PRO',
      features,
    },
  })
}
