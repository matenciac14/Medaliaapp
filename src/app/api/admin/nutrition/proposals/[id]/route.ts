import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food_proposal.repository'

const ReviewSchema = z.object({
  action:     z.enum(['APPROVE', 'REJECT']),
  reviewNote: z.string().max(500).optional(),
})

const repo = new PrismaFoodProposalRepository()

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proposalId } = await params
  const parsed = ReviewSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  await repo.review({
    proposalId,
    reviewedById: session.user.id,
    action:       parsed.data.action,
    reviewNote:   parsed.data.reviewNote,
  })

  return NextResponse.json({ ok: true })
}
