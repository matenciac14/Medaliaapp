import { NextRequest, NextResponse } from 'next/server'
import { PrismaSuggestionRepository } from '@/infrastructure/db/suggestion.repository'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const repo = new PrismaSuggestionRepository()
  const expired = await repo.expireOld()

  return NextResponse.json({ ok: true, expired })
}
