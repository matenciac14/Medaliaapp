import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { signMobileToken } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'

const USER_SELECT = {
  id: true, email: true, name: true, password: true, role: true,
  featurePlan: true, featureCheckin: true, featureNutrition: true,
  featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
  onboardingCompleted: true,
} as const

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña requeridos.' }, { status: 400 })
    }

    // Brute-force protection: 10 intentos/min por email
    const normalizedEmail = String(email).toLowerCase().trim()
    const { allowed } = await rateLimitAsync(`mobile-login-${normalizedEmail}`, { limit: 10, windowMs: 60_000 })
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta en un minuto.' }, { status: 429 })

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: USER_SELECT,
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 })
    }

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
      onboardingCompleted: user.onboardingCompleted,
      userPlan: 'PRO',
      features,
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        userPlan: 'PRO',
        features,
      },
    })
  } catch (err) {
    console.error('[mobile/login]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
