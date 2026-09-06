import type { IExerciseSourceClient } from './ports/exercise_source.client'
import type { IExerciseRepository } from './ports/exercise.repository'

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
