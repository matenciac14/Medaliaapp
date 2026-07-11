import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { CoachNutritionProposalRepository } from '@/infrastructure/db/coach-nutrition-proposal.repository'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const repo = new CoachNutritionProposalRepository(prisma)
  const proposals = await repo.findPendingForAthlete(session.user.id)
  return NextResponse.json(proposals)
}
