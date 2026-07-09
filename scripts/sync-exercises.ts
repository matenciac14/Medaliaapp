/**
 * Seed inicial de ejercicios desde WorkoutX.
 * Corre una sola vez: pnpm tsx scripts/sync-exercises.ts
 */
import 'dotenv/config'
import { WorkoutXClient } from '../src/infrastructure/exercise-sync/workoutx.client'
import { ExerciseSyncUseCase } from '../src/domain/exercise/exercise-sync.use-case'
import { PrismaExerciseRepository } from '../src/infrastructure/db/exercise.repository'

async function main() {
  const apiKey = process.env.WORKOUTX_API_KEY
  if (!apiKey) throw new Error('WORKOUTX_API_KEY no configurada en .env')

  console.log('→ Conectando a WorkoutX...')
  const client = new WorkoutXClient(apiKey)
  const repo = new PrismaExerciseRepository()
  const useCase = new ExerciseSyncUseCase(client, repo)

  console.log('→ Descargando y sincronizando ejercicios...')
  const { synced } = await useCase.execute()
  console.log(`✓ ${synced} ejercicios sincronizados en DB.`)
  process.exit(0)
}

main().catch(err => {
  console.error('✗ Error:', err.message)
  process.exit(1)
})
