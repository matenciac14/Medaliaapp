import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWearableSession } from './create_wearable_session.use_case'
import type { CreateWearableSessionInput } from './create_wearable_session.use_case'
import type { ISessionLogRepository } from '@/domain/ports/session_log.repository'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_INPUT: CreateWearableSessionInput = {
  userId: 'user-1',
  externalId: 'strava-abc',
  dataSource: 'STRAVA',
  discipline: 'RUNNING',
  distanceKm: 10,
  durationMin: 55,
  hrAvg: 145,
  hrMax: 172,
  caloriesBurned: 620,
  avgPaceSecPerKm: 330,
  sessionDate: new Date('2026-08-01'),
}

// ── Stub factory ─────────────────────────────────────────────────────────────

function makeRepo(overrides: Partial<ISessionLogRepository> = {}): ISessionLogRepository {
  return {
    findByExternalId: vi.fn().mockResolvedValue(null),
    createFromWearable: vi.fn().mockResolvedValue({ id: 'log-new' }),
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createWearableSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crea una nueva sesión cuando no existe el externalId', async () => {
    const repo = makeRepo()
    const result = await createWearableSession(BASE_INPUT, repo)

    expect(result).toEqual({ id: 'log-new', created: true })
    expect(repo.createFromWearable).toHaveBeenCalledOnce()
  })

  it('es idempotente: retorna created: false si ya existe el externalId', async () => {
    const repo = makeRepo({ findByExternalId: vi.fn().mockResolvedValue({ id: 'log-existing' }) })

    const result = await createWearableSession(BASE_INPUT, repo)

    expect(result).toEqual({ id: 'log-existing', created: false })
    expect(repo.createFromWearable).not.toHaveBeenCalled()
  })

  it('busca por userId + externalId para el check de idempotencia', async () => {
    const repo = makeRepo()
    await createWearableSession(BASE_INPUT, repo)

    expect(repo.findByExternalId).toHaveBeenCalledWith('user-1', 'strava-abc')
  })

  it('acepta input sin campos opcionales', async () => {
    const repo = makeRepo()
    const result = await createWearableSession({
      userId: 'user-1',
      externalId: 'ext-min',
      dataSource: 'HEALTHKIT',
      discipline: 'OTHER',
      sessionDate: new Date('2026-08-01'),
    }, repo)

    expect(result.created).toBe(true)
  })
})
