/**
 * Seed de ejercicios desde WorkoutX o AscendAPI.
 *
 * Uso:
 *   pnpm tsx scripts/sync-exercises.ts                    # usa EXERCISE_SOURCE del .env
 *   pnpm tsx scripts/sync-exercises.ts --source=ascendapi
 *   pnpm tsx scripts/sync-exercises.ts --source=workoutx
 */
import 'dotenv/config'
import { WorkoutXClient } from '../src/infrastructure/exercise-sync/workoutx.client'
import { AscendApiClient } from '../src/infrastructure/exercise-sync/ascendapi.client'
import { ExerciseSyncUseCase } from '../src/domain/exercise/exercise-sync.use-case'
import { PrismaExerciseRepository } from '../src/infrastructure/db/exercise.repository'
import type { IExerciseSourceClient } from '../src/domain/exercise/ports/exercise-source.client'

function resolveSource(): IExerciseSourceClient {
  const flag = process.argv.find(a => a.startsWith('--source='))?.split('=')[1]
  const source = flag ?? process.env.EXERCISE_SOURCE ?? 'ascendapi'

  if (source === 'workoutx') {
    const apiKey = process.env.WORKOUTX_API_KEY
    if (!apiKey) throw new Error('WORKOUTX_API_KEY no configurada en .env')
    console.log('→ Fuente: WorkoutX')
    return new WorkoutXClient(apiKey)
  }

  console.log('→ Fuente: AscendAPI (exercisedb.dev)')
  return new AscendApiClient()
}

async function main() {
  const client = resolveSource()
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
