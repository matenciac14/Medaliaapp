/**
 * WorkoutX API client — solo se llama en seed/sync, nunca en runtime de producción.
 * Implementa IExerciseSourceClient.
 */
import type { IExerciseSourceClient } from '@/domain/exercise/ports/exercise-source.client'
import type { UpsertExerciseData } from '@/domain/exercise/exercise.types'

const WORKOUTX_BASE_URL = 'https://api.workoutxapp.com/v1'
const PAGE_SIZE = 100

interface WorkoutXExercise {
  id: string
  name: string
  bodyPart: string
  target: string
  equipment: string
  difficulty: string
  mechanic: string
  force: string
  caloriesPerMinute: number
  met: number
  popularityRank: number
  isUnilateral: boolean
  recommendedSets: string
  recommendedReps: string
  description: string
  secondaryMuscles: string[]
  instructions: string[]
  gifUrl: string
  category: string
}

interface WorkoutXResponse {
  data: WorkoutXExercise[]
  total: number
  page: number
  limit: number
}

export class WorkoutXClient implements IExerciseSourceClient {
  constructor(private readonly apiKey: string) {}

  async fetchAll(): Promise<UpsertExerciseData[]> {
    const allExercises: UpsertExerciseData[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const url = `${WORKOUTX_BASE_URL}/exercises?page=${page}&limit=${PAGE_SIZE}`
      const response = await fetch(url, {
        headers: { 'x-api-key': this.apiKey },
      })

      if (!response.ok) {
        throw new Error(`WorkoutX API error: ${response.status} ${response.statusText}`)
      }

      const body = (await response.json()) as WorkoutXResponse
      const exercises = body.data ?? []

      for (const raw of exercises) {
        allExercises.push(this.map(raw))
      }

      hasMore = exercises.length === PAGE_SIZE
      page++
    }

    return allExercises
  }

  private map(raw: WorkoutXExercise): UpsertExerciseData {
    return {
      id: raw.id,
      name: raw.name,
      bodyPart: raw.bodyPart,
      target: raw.target,
      equipment: raw.equipment,
      difficulty: raw.difficulty || undefined,
      mechanic: raw.mechanic || undefined,
      force: raw.force || undefined,
      caloriesPerMinute: raw.caloriesPerMinute || undefined,
      met: raw.met || undefined,
      popularityRank: raw.popularityRank || undefined,
      isUnilateral: raw.isUnilateral ?? false,
      recommendedSets: raw.recommendedSets || undefined,
      recommendedReps: raw.recommendedReps || undefined,
      description: raw.description || undefined,
      secondaryMuscles: raw.secondaryMuscles ?? [],
      instructions: raw.instructions ?? [],
      gifUrl: raw.gifUrl,
      source: 'workoutx',
      syncedAt: new Date(),
    }
  }
}
