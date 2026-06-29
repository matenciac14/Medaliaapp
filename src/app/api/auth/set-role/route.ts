import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { roleSchema, parseBody } from '@/lib/validation'

const SetRoleSchema = z.object({ role: roleSchema })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(SetRoleSchema, raw)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { role } = parsed.data

  const isCoach = role === 'COACH'
  const now = new Date()

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role,
      needsRoleSelection: false,
      ...(isCoach ? {
        featurePlan:      false,
        featureCheckin:   false,
        featureNutrition: false,
        featureProgress:  false,
        featureLog:       false,
        featureCoach:     true,
        featureGym:       false,
        onboardingCompleted:   true,
        onboardingCompletedAt: now,
      } : {
        // Athlete: defaults de columnas son correctos
      }),
    },
  })

  return NextResponse.json({ ok: true, role })
}
