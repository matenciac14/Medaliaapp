import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { signMobileToken } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { emailSchema, passwordSchema, parseBody } from '@/lib/validation'

const LoginSchema = z.object({ email: emailSchema, password: passwordSchema })

const USER_SELECT = {
  id: true, email: true, name: true, password: true, role: true, status: true,
  emailVerified: true,
  featurePlan: true, featureCheckin: true, featureNutrition: true,
  featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
  onboardingCompleted: true,
} as const

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null)
    const parsed = parseBody(LoginSchema, raw)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // email ya viene normalizado (lowercase+trim) por el schema
    const { email: normalizedEmail, password } = parsed.data

    // Brute-force protection: 10 intentos/min por email
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

    // GAP-03: gate de verificación de email — activo solo cuando EMAIL_GATE_ENABLED=true
    if (process.env.EMAIL_GATE_ENABLED === 'true' && !user.emailVerified) {
      return NextResponse.json({ error: 'Debes verificar tu correo antes de iniciar sesión.' }, { status: 403 })
    }

    if (user.status !== 'ACTIVE') {
      const message = user.status === 'BLOCKED' ? 'Tu cuenta ha sido bloqueada.' : 'Tu cuenta está suspendida.'
      return NextResponse.json({ error: message }, { status: 403 })
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

    // UX-11: derivar deporte del perfil para adaptar tabs en mobile
    const healthProfile = await prisma.healthProfile.findUnique({
      where: { userId: user.id },
      select: { sportGoal: true },
    })
    const sport = healthProfile?.sportGoal === 'STRENGTH_TRAINING' ? 'STRENGTH'
      : healthProfile?.sportGoal === 'BODY_RECOMPOSITION' ? 'BOTH'
      : 'RUNNING'

    const token = await signMobileToken({
      id: user.id,
      email: user.email,
      name: user.name ?? '',
      role: user.role,
      status: user.status,
      onboardingCompleted: user.onboardingCompleted,
      userPlan: 'PRO',
      features,
      sport,
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
        sport,
      },
    })
  } catch (err) {
    console.error('[mobile/login]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
