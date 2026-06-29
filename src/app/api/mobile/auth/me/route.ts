import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'

const USER_SELECT = {
  id: true, email: true, name: true, role: true,
  featurePlan: true, featureCheckin: true, featureNutrition: true,
  featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
  onboardingCompleted: true,
} as const

// PATCH /api/mobile/auth/me — actualizar timezone y locale desde la app mobile
// expo-localization: Localization.getCalendars()[0].timeZone + Localization.getLocales()[0].languageTag
export async function PATCH(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:auth-me-patch`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const { timezone, locale } = body as { timezone?: unknown; locale?: unknown }

  if (timezone !== undefined && typeof timezone !== 'string') {
    return NextResponse.json({ error: 'timezone inválido' }, { status: 400 })
  }
  if (locale !== undefined && typeof locale !== 'string') {
    return NextResponse.json({ error: 'locale inválido' }, { status: 400 })
  }

  const data: Record<string, string> = {}
  if (timezone) data.timezone = timezone as string
  if (locale) data.locale = locale as string

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: mobile.id }, data })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:auth-me`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, { status: 429 })

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

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
    userPlan: 'PRO',
    features,
  })
}
