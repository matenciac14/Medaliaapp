import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { WorkoutXClient } from '@/infrastructure/exercise-sync/workoutx.client'
import { ExerciseSyncUseCase } from '@/domain/exercise/exercise-sync.use-case'
import { PrismaExerciseRepository } from '@/infrastructure/db/exercise.repository'

// EX-22: role ya está en el JWT — sin query extra a DB
async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
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
