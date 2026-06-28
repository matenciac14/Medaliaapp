import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { signMobileToken } from '@/lib/mobile-auth'
import { parseUserConfig, getUserPlan, DEFAULT_USER_CONFIG } from '@/lib/config/user-config'

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

  // Verificar que el token es para nuestra app
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

    if (googleUser.email_verified !== 'true') {
      return NextResponse.json({ error: 'Correo de Google no verificado.' }, { status: 400 })
    }

    // Buscar usuario existente por email
    let dbUser = await prisma.user.findUnique({
      where: { email: googleUser.email },
      select: { id: true, email: true, name: true, role: true, config: true, image: true },
    })

    let needsRoleSelection = false

    if (!dbUser) {
      // Usuario nuevo — crear con config null, role ATHLETE por defecto
      dbUser = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture ?? null,
          role: 'ATHLETE',
          config: null as any,
        },
        select: { id: true, email: true, name: true, role: true, config: true, image: true },
      })
      needsRoleSelection = true
    } else if (!dbUser.config) {
      // Existe pero nunca completó selección de rol
      needsRoleSelection = true
    }

    const config = dbUser.config ? parseUserConfig(dbUser.config) : null

    const token = await signMobileToken({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? '',
      role: dbUser.role,
      onboardingCompleted: config?.onboarding.completed ?? false,
      userPlan: config ? getUserPlan(config.features) : 'FREE',
      features: config?.features ?? DEFAULT_USER_CONFIG.features,
    })

    return NextResponse.json({
      token,
      needsRoleSelection,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        onboardingCompleted: config?.onboarding.completed ?? false,
        userPlan: config ? getUserPlan(config.features) : 'FREE',
        features: config?.features ?? DEFAULT_USER_CONFIG.features,
      },
    })
  } catch (err: any) {
    console.error('[mobile/auth/google]', err)
    const message = err.message?.includes('inválido') || err.message?.includes('aplicación')
      ? err.message
      : 'Error al autenticar con Google.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
