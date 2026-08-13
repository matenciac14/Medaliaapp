import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { respondCoachProposal, ProposalError } from '@/domain/nutrition/respond-coach-proposal.use-case'

const bodySchema = z.object({
  action: z.enum(['ACCEPTED', 'REJECTED']),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = bodySchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

  try {
    const result = await respondCoachProposal(prisma, {
      proposalId: id,
      athleteId: session.user.id,
      action: body.data.action,
    })
    return NextResponse.json(result.proposal)
  } catch (err) {
    if (err instanceof ProposalError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
