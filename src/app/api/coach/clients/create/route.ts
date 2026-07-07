import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { sendAthleteWelcomeEmail } from '@/infrastructure/email/resend'
import { nameSchema, emailSchema, parseBody } from '@/lib/validation'
import { getCoachLimits, type CoachTier } from '@/domain/subscription/tier-features'

const CreateAthleteSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  sport: z.string().max(50).nullable().optional(),
  goal: z.string().max(100).nullable().optional(),
  // Optional health profile pre-fill
  heightCm:        z.number().min(50).max(280).optional(),
  weightKg:        z.number().min(20).max(400).optional(),
  dateOfBirth:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender:          z.enum(['male', 'female']).optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
})

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

  // Block if coach identity is incomplete (identification + phoneWa required before inviting athletes)
  if (!session.user.profileComplete) {
    const coachUser = await prisma.user.findUnique({
      where: { id: coachId },
      select: { identification: true, phoneWa: true },
    })
    if (!coachUser?.identification || !coachUser?.phoneWa) {
      return NextResponse.json(
        { error: 'Completa tu cédula y número de WhatsApp en tu perfil antes de invitar asesorados.', code: 'PROFILE_INCOMPLETE' },
        { status: 403 }
      )
    }
  }

  try {
    const raw = await req.json().catch(() => null)
    const parsed = parseBody(CreateAthleteSchema, raw)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { name, email, sport = null, goal = null, heightCm, weightKg, dateOfBirth, gender, experienceLevel } = parsed.data

    // Enforce coach tier athlete limit before any write
    const [activeCount, coachSub] = await Promise.all([
      prisma.coachAthlete.count({ where: { coachId, status: 'ACTIVE' } }),
      prisma.userSubscription.findUnique({
        where: { userId: coachId },
        select: { coachTier: true },
      }),
    ])
    const coachTier = (coachSub?.coachTier ?? 'STARTER') as CoachTier
    const { maxAthletes } = getCoachLimits(coachTier)
    if (activeCount >= maxAthletes) {
      return NextResponse.json(
        {
          error: `Alcanzaste el límite de tu plan (${maxAthletes} asesorados). Actualiza a un plan superior para agregar más.`,
          code: 'COACH_LIMIT_REACHED',
          limit: maxAthletes,
          current: activeCount,
        },
        { status: 402 }
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

      // Atleta B2B no tiene suscripción propia — su acceso lo gestiona el coach

      // Pre-fill HealthProfile if coach provided physical data
      if (heightCm && weightKg) {
        const dob = dateOfBirth ? new Date(dateOfBirth) : null
        const age = dob
          ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : 0
        await tx.healthProfile.create({
          data: {
            userId:          newAthlete.id,
            age,
            heightCm,
            weightKg,
            gender:          gender ?? null,
            dateOfBirth:     dob,
            experienceLevel: experienceLevel ?? null,
            sport:           sport ?? null,
            sportGoal:       goal ?? null,
          },
        })
      }

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
