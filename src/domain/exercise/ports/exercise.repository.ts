import type { Exercise, ExerciseFilters, UpsertExerciseData } from '../exercise.types'

export interface IExerciseRepository {
  findAll(filters?: ExerciseFilters): Promise<{ exercises: Exercise[]; total: number }>
  findById(id: string): Promise<Exercise | null>
  findSimilar(id: string, limit?: number): Promise<Exercise[]>
  upsertMany(exercises: UpsertExerciseData[]): Promise<{ synced: number }>
}
