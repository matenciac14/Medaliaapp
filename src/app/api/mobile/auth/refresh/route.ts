import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser, signMobileToken } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'

const USER_SELECT = {
  id: true, email: true, name: true, role: true, status: true,
  featurePlan: true, featureCheckin: true, featureNutrition: true,
  featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
  onboardingCompleted: true,
} as const

// POST /api/mobile/auth/refresh — reemite JWT con features frescas desde DB
// Usar cuando el entrenador activa features de un atleta B2B y el token stale
export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:auth-refresh`, { limit: 10, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const user = await prisma.user.findUnique({
    where: { id: mobile.id },
    select: USER_SELECT,
  })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const features = {
    plan:      user.featurePlan,
    checkin:   user.featureCheckin,
    nutrition: user.featureNutrition,
    progress:  user.featureProgress,
    log:       user.featureLog,
    coach:     user.featureCoach,
    gym:       user.featureGym,
  }

  const token = await signMobileToken({
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    role: user.role,
    status: user.status,
    onboardingCompleted: user.onboardingCompleted,
    userPlan: 'PRO',
    features,
  })

  return NextResponse.json({ token, features })
}
