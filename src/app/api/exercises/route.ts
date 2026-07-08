import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'

const repo = new PrismaExerciseRepository()

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filters = {
    bodyPart:  searchParams.get('bodyPart')  ?? undefined,
    target:    searchParams.get('target')    ?? undefined,
    equipment: searchParams.get('equipment') ?? undefined,
    q:         searchParams.get('q')         ?? undefined,
    page:      searchParams.get('page')  ? Number(searchParams.get('page'))  : 1,
    limit:     searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
  }

  const { exercises, total } = await repo.findAll(filters)
  return NextResponse.json({ exercises, total })
}
