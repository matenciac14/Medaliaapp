import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { PrismaFoodProposalRepository } from '@/infrastructure/db/food-proposal.repository'

const repo = new PrismaFoodProposalRepository()

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:my-proposals`, { limit: 120, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const proposals = await repo.listByUser(mobile.id)
  return NextResponse.json({ proposals })
}
