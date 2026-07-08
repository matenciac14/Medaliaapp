import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { WorkoutXClient } from '@/infrastructure/exercise-sync/workoutx.client'
import { ExerciseSyncUseCase } from '@/infrastructure/exercise-sync/exercise-sync.use-case'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return u?.role === 'ADMIN' ? session : null
}

// POST /api/admin/exercises/sync — re-seed desde WorkoutX (usa free plan, ~14 req)
export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const apiKey = process.env.WORKOUTX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'WORKOUTX_API_KEY no configurada' }, { status: 500 })

  const client = new WorkoutXClient(apiKey)
  const repo = new PrismaExerciseRepository()
  const useCase = new ExerciseSyncUseCase(client, repo)

  const { synced } = await useCase.execute()
  return NextResponse.json({ synced })
}
