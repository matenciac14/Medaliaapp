import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food-proposal.repository'

const repo = new PrismaFoodProposalRepository()

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const proposals = await repo.listByUser(session.user.id)
  return NextResponse.json({ proposals })
}
