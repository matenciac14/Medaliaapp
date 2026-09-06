import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { PrismaSuggestionRepository } from '@/infrastructure/db/suggestion.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { applySessionAdjustments } from '@/domain/checkin/process_check_in.use_case'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:suggest-accept`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const { id } = await params
  const userId = mobile.id

  const suggRepo = new PrismaSuggestionRepository()
  const suggestion = await suggRepo.findById(id)

  if (!suggestion) return NextResponse.json({ error: 'Sugerencia no encontrada' }, { status: 404 })
  if (suggestion.userId !== userId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (suggestion.status !== 'PENDING') {
    return NextResponse.json({ error: 'Sugerencia ya respondida o expirada' }, { status: 409 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.checkInSuggestion.update({
      where: { id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })

    const payload = suggestion.payload
    if (
      (suggestion.type === 'PLAN_ADJUSTMENT' || suggestion.type === 'RECOVERY_WEEK') &&
      typeof payload.planId === 'string' &&
      typeof payload.nextWeek === 'number'
    ) {
      const txPlan = new PrismaPlanRepository(tx)
      const triggers = Array.isArray(payload.triggers)
        ? (payload.triggers as string[])
        : ['energia_baja']
      await applySessionAdjustments(payload.planId, payload.nextWeek, triggers, txPlan)
    }
  })

  return NextResponse.json({ ok: true })
}
