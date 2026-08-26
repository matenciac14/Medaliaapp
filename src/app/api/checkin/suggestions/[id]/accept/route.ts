import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { PrismaSuggestionRepository } from '@/infrastructure/db/suggestion.repository'
import { PrismaPlanRepository } from '@/infrastructure/db/plan.repository'
import { applySessionAdjustments } from '@/domain/checkin/process-check-in.use-case'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const userId = session.user.id

  const suggRepo = new PrismaSuggestionRepository()
  const suggestion = await suggRepo.findById(id)

  if (!suggestion) return NextResponse.json({ error: 'Sugerencia no encontrada' }, { status: 404 })
  if (suggestion.userId !== userId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (suggestion.status !== 'PENDING') {
    return NextResponse.json({ error: 'Sugerencia ya respondida o expirada' }, { status: 409 })
  }

  await prisma.$transaction(async (tx) => {
    // Mark as accepted
    await tx.checkInSuggestion.update({
      where: { id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })

    // Apply payload
    const payload = suggestion.payload
    if (
      (suggestion.type === 'PLAN_ADJUSTMENT' || suggestion.type === 'RECOVERY_WEEK') &&
      typeof payload.planId === 'string' &&
      typeof payload.nextWeek === 'number'
    ) {
      const txPlan = new PrismaPlanRepository(tx)
      const triggers = Array.isArray(payload.triggers)
        ? (payload.triggers as string[])
        : ['energia_baja'] // default for RECOVERY_WEEK
      await applySessionAdjustments(payload.planId, payload.nextWeek, triggers, txPlan)
    }
  })

  return NextResponse.json({ ok: true })
}
