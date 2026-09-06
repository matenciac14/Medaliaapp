import type { UpsertExerciseData } from '../exercise.types'

export interface IExerciseSourceClient {
  fetchAll(): Promise<UpsertExerciseData[]>
}
