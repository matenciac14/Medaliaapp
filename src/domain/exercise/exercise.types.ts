/**
 * Exercise domain types — WorkoutX-compatible.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

export interface Exercise {
  id: string
  name: string
  /** Nombre en español del dataset WorkoutX. Usar nameEs ?? name en UI. */
  nameEs?: string
  bodyPart: string
  target: string
  equipment: string
  difficulty?: string
  mechanic?: string
  force?: string
  caloriesPerMinute?: number
  met?: number
  popularityRank?: number
  isUnilateral: boolean
  recommendedSets?: string
  recommendedReps?: string
  description?: string
  secondaryMuscles: string[]
  instructions: string[]
  /** Instrucciones en español. Usar instructionsEs.length ? instructionsEs : instructions en UI. */
  instructionsEs: string[]
  /** gifStoredUrl ?? gifUrl — resuelto en la capa de infra. Vacío si es ejercicio custom sin gif. */
  gif: string
  source: string
  syncedAt?: Date
}

export interface ExerciseFilters {
  bodyPart?: string
  target?: string
  equipment?: string
  q?: string
  page?: number
  limit?: number
  /** Si se proporciona: devuelve ejercicios del coach + globales (coachId: null). Sin él: solo globales. */
  coachId?: string
}

export interface UpsertExerciseData {
  id: string
  name: string
  nameEs?: string
  bodyPart: string
  target: string
  equipment: string
  difficulty?: string
  mechanic?: string
  force?: string
  caloriesPerMinute?: number
  met?: number
  popularityRank?: number
  isUnilateral: boolean
  recommendedSets?: string
  recommendedReps?: string
  description?: string
  secondaryMuscles: string[]
  instructions: string[]
  instructionsEs?: string[]
  gifUrl: string
  source: string
  syncedAt: Date
}
