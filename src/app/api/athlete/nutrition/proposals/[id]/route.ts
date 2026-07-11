import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { CoachNutritionProposalRepository } from '@/infrastructure/db/coach-nutrition-proposal.repository'

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

  const repo = new CoachNutritionProposalRepository(prisma)
  try {
    const updated = await repo.respond(id, session.user.id, body.data.action)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Propuesta no encontrada o ya respondida' }, { status: 404 })
  }
}
