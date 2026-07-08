import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'

const repo = new PrismaExerciseRepository()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 6

  const exercises = await repo.findSimilar(id, limit)
  return NextResponse.json({ exercises })
}
