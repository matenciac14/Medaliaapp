import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate-limit'
import { sendCoachWelcomeEmail, sendEmailVerification } from '@/infrastructure/email/resend'
import { emailSchema, passwordSchema, nameSchema, roleSchema, parseBody } from '@/lib/validation'

const RegisterSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.optional().default('ATHLETE'),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { allowed } = await rateLimitAsync(`register:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
  }

  try {
    const raw = await req.json().catch(() => null)
    const parsed = parseBody(RegisterSchema, raw)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { name, email, password, role } = parsed.data
    const userRole = role

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese correo.' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const isCoach = userRole === 'COACH'

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        // Coach: solo feature coach activa, onboarding completado
        ...(isCoach ? {
          featurePlan:      false,
          featureCheckin:   false,
          featureNutrition: false,
          featureProgress:  false,
          featureLog:       false,
          featureCoach:     true,
          featureGym:       false,
          onboardingCompleted:   true,
          onboardingCompletedAt: new Date(),
        } : {
          // Athlete: defaults de columnas son correctos (all true excepto coach)
        }),
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://medaliq.com'

    if (userRole === 'COACH') {
      sendCoachWelcomeEmail(email, name, `${baseUrl}/login`).catch(() => {})
    }

    // Email verification — solo para registro email+password (Google OAuth ya verifica)
    const verificationToken = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    await prisma.verificationToken.create({
      data: { identifier: email, token: verificationToken, expires },
    })
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`
    sendEmailVerification(email, name, verifyUrl).catch(() => {})

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
