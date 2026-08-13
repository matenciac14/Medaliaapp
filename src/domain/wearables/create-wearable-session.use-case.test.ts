import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { createWearableSession } from './create-wearable-session.use-case'
import type { CreateWearableSessionInput } from './create-wearable-session.use-case'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    sessionLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

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

describe('createWearableSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crea una nueva sesión cuando no existe el externalId', async () => {
    vi.mocked(prisma.sessionLog.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sessionLog.create).mockResolvedValue({ id: 'log-new' } as any)

    const result = await createWearableSession(BASE_INPUT)

    expect(result).toEqual({ id: 'log-new', created: true })
    expect(prisma.sessionLog.create).toHaveBeenCalledOnce()
  })

  it('es idempotente: retorna created: false si ya existe el externalId', async () => {
    vi.mocked(prisma.sessionLog.findFirst).mockResolvedValue({ id: 'log-existing' } as any)

    const result = await createWearableSession(BASE_INPUT)

    expect(result).toEqual({ id: 'log-existing', created: false })
    expect(prisma.sessionLog.create).not.toHaveBeenCalled()
  })

  it('busca por userId + externalId para el check de idempotencia', async () => {
    vi.mocked(prisma.sessionLog.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sessionLog.create).mockResolvedValue({ id: 'log-new' } as any)

    await createWearableSession(BASE_INPUT)

    expect(prisma.sessionLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', externalId: 'strava-abc' },
      })
    )
  })

  it('redondea durationMin y avgPaceSecPerKm al entero más cercano', async () => {
    vi.mocked(prisma.sessionLog.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sessionLog.create).mockResolvedValue({ id: 'log-new' } as any)

    await createWearableSession({ ...BASE_INPUT, durationMin: 55.7, avgPaceSecPerKm: 330.4 })

    const data = vi.mocked(prisma.sessionLog.create).mock.calls[0][0].data
    expect(data.durationMin).toBe(56)
    expect(data.avgPaceSecPerKm).toBe(330)
  })

  it('acepta input sin campos opcionales', async () => {
    vi.mocked(prisma.sessionLog.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sessionLog.create).mockResolvedValue({ id: 'log-min' } as any)

    const result = await createWearableSession({
      userId: 'user-1',
      externalId: 'ext-min',
      dataSource: 'HEALTHKIT',
      discipline: 'OTHER',
      sessionDate: new Date('2026-08-01'),
    })

    expect(result.created).toBe(true)
  })
})
