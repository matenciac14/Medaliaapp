import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ sport: null, goal: null })

  const profile = await prisma.healthProfile.findUnique({
    where: { userId: session.user.id },
    select: { sport: true, sportGoal: true },
  })

  return NextResponse.json({
    sport: profile?.sport ?? null,
    goal: profile?.sportGoal ?? null,
  })
}

// BUG-071 + UX-04: guardar meta sin generar plan (el plan lo crea el coach o lo genera el sistema después)
const PatchSportSchema = z.object({
  goalType: z.string().min(1),
  raceDate: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const raw = await req.json().catch(() => null)
  const parsed = PatchSportSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'goalType requerido' }, { status: 400 })

  const { goalType, raceDate } = parsed.data

  await prisma.healthProfile.upsert({
    where: { userId: session.user.id },
    update: {
      sportGoal: goalType,
      ...(raceDate ? { raceDate: new Date(raceDate) } : {}),
    },
    create: {
      userId: session.user.id,
      age: 0, heightCm: 0, weightKg: 0,
      sportGoal: goalType,
      ...(raceDate ? { raceDate: new Date(raceDate) } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}
