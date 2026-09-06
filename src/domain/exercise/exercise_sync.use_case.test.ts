import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExerciseSyncUseCase } from './exercise_sync.use_case'
import type { IExerciseSourceClient } from './ports/exercise_source.client'
import type { IExerciseRepository } from './ports/exercise.repository'

function makeSource(exercises: object[] = []): IExerciseSourceClient {
  return { fetchAll: vi.fn().mockResolvedValue(exercises) }
}

function makeRepo(synced = 0): IExerciseRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findSimilar: vi.fn(),
    upsertMany: vi.fn().mockResolvedValue({ synced }),
  }
}

describe('ExerciseSyncUseCase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('llama fetchAll y luego upsertMany con el resultado', async () => {
    const exercises = [{ id: 'ex-1', name: 'Sentadilla' }]
    const source = makeSource(exercises)
    const repo = makeRepo(1)
    const useCase = new ExerciseSyncUseCase(source, repo)

    const result = await useCase.execute()

    expect(source.fetchAll).toHaveBeenCalledOnce()
    expect(repo.upsertMany).toHaveBeenCalledWith(exercises)
    expect(result).toEqual({ synced: 1 })
  })

  it('retorna { synced: 0 } cuando la fuente no tiene ejercicios', async () => {
    const source = makeSource([])
    const repo = makeRepo(0)
    const useCase = new ExerciseSyncUseCase(source, repo)

    const result = await useCase.execute()

    expect(result).toEqual({ synced: 0 })
    expect(repo.upsertMany).toHaveBeenCalledWith([])
  })

  it('propaga error del source sin silenciarlo', async () => {
    const source: IExerciseSourceClient = { fetchAll: vi.fn().mockRejectedValue(new Error('API down')) }
    const repo = makeRepo()
    const useCase = new ExerciseSyncUseCase(source, repo)

    await expect(useCase.execute()).rejects.toThrow('API down')
    expect(repo.upsertMany).not.toHaveBeenCalled()
  })

  it('propaga error del repo sin silenciarlo', async () => {
    const source = makeSource([{ id: 'ex-1' }])
    const repo = makeRepo()
    ;(repo.upsertMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))
    const useCase = new ExerciseSyncUseCase(source, repo)

    await expect(useCase.execute()).rejects.toThrow('DB error')
  })
})
