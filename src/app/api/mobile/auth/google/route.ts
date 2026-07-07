import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { signMobileToken } from '@/lib/mobile-auth'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user-config'
import { rateLimitAsync } from '@/lib/rate-limit'

const USER_SELECT = {
  id: true, email: true, name: true, role: true, status: true, image: true,
  featurePlan: true, featureCheckin: true, featureNutrition: true,
  featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
  onboardingCompleted: true, needsRoleSelection: true,
} as const

type GoogleTokenInfo = {
  sub: string
  email: string
  name: string
  picture?: string
  aud: string
  email_verified: string
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenInfo> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  )
  if (!res.ok) throw new Error('Token de Google inválido.')
  const data = await res.json()
  if (data.error) throw new Error(data.error_description ?? 'Token de Google inválido.')

  const validAudiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean)

  if (validAudiences.length > 0 && !validAudiences.includes(data.aud)) {
    throw new Error('Token no corresponde a esta aplicación.')
  }

  return data as GoogleTokenInfo
}

export async function POST(req: NextRequest) {
  const clientHeader = req.headers.get('X-Client')
  if (clientHeader !== 'medaliq-mobile') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  try {
    const { idToken } = await req.json()
    if (!idToken) {
      return NextResponse.json({ error: 'idToken requerido.' }, { status: 400 })
    }

    const googleUser = await verifyGoogleToken(idToken)

    // Rate limit por email verificado: 20 intentos/min
    const { allowed } = await rateLimitAsync(`mobile-google-${googleUser.email}`, { limit: 20, windowMs: 60_000 })
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta en un minuto.' }, { status: 429 })

    if (googleUser.email_verified !== 'true') {
      return NextResponse.json({ error: 'Correo de Google no verificado.' }, { status: 400 })
    }

    let dbUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
      select: USER_SELECT,
    })

    let needsRoleSelection = false

    if (!dbUser) {
      // Usuario nuevo — crear con needsRoleSelection = true
      dbUser = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture ?? null,
          role: 'ATHLETE',
          needsRoleSelection: true,
          onboardingCompleted: false,
        },
        select: USER_SELECT,
      })
      needsRoleSelection = true
    } else if (dbUser.needsRoleSelection) {
      needsRoleSelection = true
    }

    const features = dbUser.needsRoleSelection
      ? DEFAULT_USER_CONFIG.features
      : {
          plan:      dbUser.featurePlan,
          checkin:   dbUser.featureCheckin,
          nutrition: dbUser.featureNutrition,
          progress:  dbUser.featureProgress,
          log:       dbUser.featureLog,
          coach:     dbUser.featureCoach,
          gym:       dbUser.featureGym,
        }

    const token = await signMobileToken({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? '',
      role: dbUser.role,
      status: dbUser.status ?? 'ACTIVE',
      onboardingCompleted: dbUser.onboardingCompleted,
      userPlan: 'PRO',
      features,
    })

    return NextResponse.json({
      token,
      needsRoleSelection,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        onboardingCompleted: dbUser.onboardingCompleted,
        userPlan: 'PRO',
        features,
      },
    })
  } catch (err: unknown) {
    console.error('[mobile/auth/google]', err)
    const errMessage = err instanceof Error ? err.message : ''
    const message = errMessage.includes('inválido') || errMessage.includes('aplicación')
      ? errMessage
      : 'Error al autenticar con Google.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
