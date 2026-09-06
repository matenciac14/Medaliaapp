import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food_proposal.repository'

const repo = new PrismaFoodProposalRepository()

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const [proposals, pendingCount] = await Promise.all([
    repo.listPending(100),
    repo.countPending(),
  ])

  return NextResponse.json({ proposals, pendingCount })
}
