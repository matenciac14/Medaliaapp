/**
 * WorkoutX API client — solo se llama en seed/sync, nunca en runtime de producción.
 * Implementa IExerciseSourceClient.
 */
import type { IExerciseSourceClient } from '@/domain/exercise/ports/exercise-source.client'
import type { UpsertExerciseData } from '@/domain/exercise/exercise.types'

const WORKOUTX_BASE_URL = 'https://api.workoutxapp.com/v1'
const PAGE_SIZE = 10 // free plan cap

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

/** Respuesta del endpoint con lang=es — campos traducidos cuando el param está presente. */
interface WorkoutXExerciseEs extends WorkoutXExercise {
  nameEs?: string
  instructionsEs?: string[]
}

interface WorkoutXResponse {
  data: WorkoutXExerciseEs[]
  total: number
  page: number
  limit: number
}

export class WorkoutXClient implements IExerciseSourceClient {
  constructor(private readonly apiKey: string) {}

  /**
   * Descarga todos los ejercicios en batches de BATCH_PAGES páginas.
   * Llama onBatch() después de cada batch para persistir sin perder progreso si hay 429.
   */
  async fetchAll(): Promise<UpsertExerciseData[]> {
    const allExercises: UpsertExerciseData[] = []
    let page = 1
    let total = Infinity

    while (allExercises.length < total) {
      const url = `${WORKOUTX_BASE_URL}/exercises?page=${page}&limit=${PAGE_SIZE}&lang=es`
      const batch = await this.fetchPage(url)
      if (!batch) break

      total = batch.total
      if (batch.exercises.length === 0) break

      allExercises.push(...batch.exercises)
      process.stdout.write(`\r  → ${allExercises.length}/${total}...`)

      // 500ms entre páginas para mantenerse bajo el rate limit
      await new Promise(r => setTimeout(r, 500))
      page++
    }

    process.stdout.write(`\r  → ${allExercises.length}/${total} ejercicios.   \n`)
    return allExercises
  }

  private async fetchPage(url: string): Promise<{ exercises: UpsertExerciseData[]; total: number } | null> {
    for (let attempt = 1; attempt <= 6; attempt++) {
      const response = await fetch(url, { headers: { 'X-WorkoutX-Key': this.apiKey } })

      if (response.status === 429) {
        const wait = attempt * 5000
        process.stdout.write(`\r  ⚠ 429 rate limit — esperando ${wait / 1000}s...`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }

      if (!response.ok) {
        throw new Error(`WorkoutX API error: ${response.status} ${response.statusText}`)
      }

      const body = (await response.json()) as WorkoutXResponse
      return { exercises: (body.data ?? []).map(r => this.map(r)), total: body.total }
    }
    return null
  }

  private map(raw: WorkoutXExerciseEs): UpsertExerciseData {
    return {
      id: raw.id,
      name: raw.name,
      nameEs: raw.nameEs || undefined,
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
      instructionsEs: raw.instructionsEs ?? [],
      gifUrl: raw.gifUrl,
      source: 'workoutx',
      syncedAt: new Date(),
    }
  }
}
