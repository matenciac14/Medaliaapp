import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { revalidateTag } from 'next/cache'

type AIProfile = {
  coachingPhilosophy: string
  periodizationPrinciples: string
  injuryProtocol: string
  nutritionGuidelines: string
  goalNotes: string
}

const DEFAULT_AI_PROFILE: AIProfile = {
  coachingPhilosophy: '',
  periodizationPrinciples: '',
  injuryProtocol: '',
  nutritionGuidelines: '',
  goalNotes: '',
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const config = await prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
  const aiProfile = (config?.aiProfile as AIProfile | null) ?? DEFAULT_AI_PROFILE

  return NextResponse.json({ aiProfile })
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { coachingPhilosophy, periodizationPrinciples, injuryProtocol, nutritionGuidelines, goalNotes } = body

  const aiProfile: AIProfile = {
    coachingPhilosophy: String(coachingPhilosophy ?? ''),
    periodizationPrinciples: String(periodizationPrinciples ?? ''),
    injuryProtocol: String(injuryProtocol ?? ''),
    nutritionGuidelines: String(nutritionGuidelines ?? ''),
    goalNotes: String(goalNotes ?? ''),
  }

  await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', aiProfile: aiProfile as object },
    update: { aiProfile: aiProfile as object },
  })

  revalidateTag('system-config', 'default')

  return NextResponse.json({ ok: true, aiProfile })
}
