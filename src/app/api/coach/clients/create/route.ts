import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { sendAthleteWelcomeEmail } from '@/infrastructure/email/resend'

function generateTempPassword(length = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function generateResetLink(athleteId: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)
  const token = await new SignJWT({ sub: athleteId, purpose: 'set-password' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://medaliq.com'}/set-password?token=${token}`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const coachId = session.user.id

  try {
    const body = await req.json()
    const {
      name,
      email,
      sport,
      goal,
    } = body as {
      name: string
      email: string
      sport: string | null
      goal: string | null
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y correo son obligatorios.' },
        { status: 400 }
      )
    }

    // Check email not already registered
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese correo.' },
        { status: 409 }
      )
    }

    const tempPassword = generateTempPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    // Create athlete user and link to coach atomically
    const athlete = await prisma.$transaction(async (tx) => {
      const newAthlete = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ATHLETE',
          // B2B athlete: todas las features desactivadas hasta que el coach active
          featurePlan:      false,
          featureCheckin:   false,
          featureNutrition: false,
          featureProgress:  false,
          featureLog:       false,
          featureCoach:     false,
          featureGym:       false,
          onboardingCompleted: false,
        },
      })
      await tx.coachAthlete.create({
        data: {
          coachId,
          athleteId: newAthlete.id,
        },
      })
      return newAthlete
    })

    const resetLink = await generateResetLink(athlete.id)

    sendAthleteWelcomeEmail(athlete.email!, athlete.name!, session.user.name ?? 'Tu coach', resetLink).catch(() => {})

    return NextResponse.json({
      ok: true,
      email: athlete.email,
      resetLink,
      athleteId: athlete.id,
      athleteName: athlete.name,
    }, { status: 201 })
  } catch (err) {
    console.error('[coach/clients/create]', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
