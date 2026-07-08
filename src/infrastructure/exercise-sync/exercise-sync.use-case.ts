import type { IExerciseSourceClient } from '@/domain/exercise/ports/exercise-source.client'
import type { IExerciseRepository } from '@/domain/exercise/ports/exercise.repository'

export class ExerciseSyncUseCase {
  constructor(
    private readonly source: IExerciseSourceClient,
    private readonly repo: IExerciseRepository,
  ) {}

  async execute(): Promise<{ synced: number }> {
    const exercises = await this.source.fetchAll()
    return this.repo.upsertMany(exercises)
  }
}
