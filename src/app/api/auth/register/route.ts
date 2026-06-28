import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate-limit'
import { sendCoachWelcomeEmail } from '@/infrastructure/email/resend'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { allowed } = await rateLimitAsync(`register:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
  }

  try {
    const { name, email, password, role } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Nombre, correo y contraseña son obligatorios.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'El correo no es válido.' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 })
    }

    const userRole = role === 'COACH' ? 'COACH' : 'ATHLETE'

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

    if (userRole === 'COACH') {
      const loginUrl = `${process.env.NEXTAUTH_URL ?? 'https://medaliq.com'}/login`
      sendCoachWelcomeEmail(email, name, loginUrl).catch(() => {})
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
