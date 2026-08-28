/**
 * AscendAPI (ExerciseDB) client — fuente alternativa gratuita de ejercicios.
 * 1,500 ejercicios, GIFs en Cloudflare CDN público (sin proxy ni auth).
 * Implementa IExerciseSourceClient — intercambiable con WorkoutXClient sin tocar el use case.
 *
 * Paginación: cursor (nextCursor = exerciseId del último item) pasado como ?after=<id>.
 * Docs: https://oss.exercisedb.dev/api/v1/exercises
 */
import type { IExerciseSourceClient } from '@/domain/exercise/ports/exercise-source.client'
import type { UpsertExerciseData } from '@/domain/exercise/exercise.types'

const BASE_URL = 'https://oss.exercisedb.dev/api/v1/exercises'
const PAGE_SIZE = 25 // máximo que acepta la API sin rate limit por página

interface AscendExercise {
  exerciseId: string
  name: string
  bodyParts: string[]
  targetMuscles: string[]
  secondaryMuscles: string[]
  equipments: string[]
  gifUrl: string
  instructions: string[]
}

interface AscendResponse {
  success: boolean
  meta: {
    total: number
    hasNextPage: boolean
    nextCursor: string | null
  }
  data: AscendExercise[]
}

export class AscendApiClient implements IExerciseSourceClient {
  async fetchAll(): Promise<UpsertExerciseData[]> {
    const all: UpsertExerciseData[] = []
    let after: string | null = null
    let hasNextPage = true
    let total = 0

    while (hasNextPage) {
      const url = after
        ? `${BASE_URL}?limit=${PAGE_SIZE}&after=${after}`
        : `${BASE_URL}?limit=${PAGE_SIZE}`

      const batch = await this.fetchPage(url)
      if (!batch) break

      total = batch.total
      all.push(...batch.exercises)
      process.stdout.write(`\r  → ${all.length}/${total}...`)

      hasNextPage = batch.hasNextPage
      after = batch.nextCursor

      // Delay cortés entre páginas para no agotar el rate limit
      if (hasNextPage) await new Promise(r => setTimeout(r, 400))
    }

    process.stdout.write(`\r  → ${all.length} ejercicios descargados.   \n`)
    return all
  }

  private async fetchPage(url: string): Promise<{
    exercises: UpsertExerciseData[]
    total: number
    hasNextPage: boolean
    nextCursor: string | null
  } | null> {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (response.status === 429) {
        const wait = attempt * 5000
        process.stdout.write(`\r  ⚠ 429 — esperando ${wait / 1000}s (intento ${attempt}/4)...`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }

      if (!response.ok) {
        throw new Error(`AscendAPI error: ${response.status} ${response.statusText}`)
      }

      const body = (await response.json()) as AscendResponse
      return {
        exercises: (body.data ?? []).map(r => this.map(r)),
        total: body.meta?.total ?? 0,
        hasNextPage: body.meta?.hasNextPage ?? false,
        nextCursor: body.meta?.nextCursor ?? null,
      }
    }
    return null
  }

  private map(raw: AscendExercise): UpsertExerciseData {
    return {
      id: raw.exerciseId,
      name: raw.name,
      // AscendAPI no provee nombre en español
      bodyPart: raw.bodyParts[0] ?? 'other',
      target: raw.targetMuscles[0] ?? 'other',
      equipment: raw.equipments[0] ?? 'body weight',
      secondaryMuscles: raw.secondaryMuscles,
      instructions: raw.instructions,
      isUnilateral: false,
      // GIF público en Cloudflare CDN — gifStoredUrl bypasea el proxy WorkoutX
      gifStoredUrl: raw.gifUrl,
      source: 'ascendapi',
      syncedAt: new Date(),
    }
  }
}
