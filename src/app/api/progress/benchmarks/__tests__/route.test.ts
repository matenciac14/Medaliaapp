import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    performanceBenchmark: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { GET, POST, DELETE } from '../route'

const SESSION_WITH_PROGRESS = {
  user: { id: 'user-1', role: 'ATHLETE', features: { progress: true } },
}
const SESSION_NO_PROGRESS = {
  user: { id: 'user-1', role: 'ATHLETE', features: { progress: false } },
}

const MOCK_BENCHMARK = {
  id: 'bm-1',
  userId: 'user-1',
  coachId: null,
  sport: 'RUNNING',
  metric: '5K_TIME',
  value: 1200,
  unit: 'seconds',
  testedAt: new Date('2026-01-01'),
  notes: null,
}

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/progress/benchmarks`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/progress/benchmarks', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('retorna 403 sin feature progress', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION_NO_PROGRESS as any)
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(403)
  })

  it('retorna benchmarks del usuario autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION_WITH_PROGRESS as any)
    vi.mocked(prisma.performanceBenchmark.findMany).mockResolvedValue([MOCK_BENCHMARK] as any)

    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.benchmarks).toHaveLength(1)
    expect(data.benchmarks[0].id).toBe('bm-1')
  })
})

describe('POST /api/progress/benchmarks', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(makeReq('POST', { sport: 'RUNNING', metric: '5K_TIME', value: 1200, unit: 'seconds', testedAt: '2026-01-01' }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 con métrica inválida', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION_WITH_PROGRESS as any)
    const res = await POST(makeReq('POST', { sport: 'RUNNING', metric: 'INVALID_METRIC', value: 1200, unit: 'seconds', testedAt: '2026-01-01' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/metric inválido/)
  })

  it('retorna 400 con deporte inválido', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION_WITH_PROGRESS as any)
    const res = await POST(makeReq('POST', { sport: 'POLO', metric: '5K_TIME', value: 1200, unit: 'seconds', testedAt: '2026-01-01' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/sport inválido/)
  })

  it('crea benchmark con datos válidos → 201', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION_WITH_PROGRESS as any)
    vi.mocked(prisma.performanceBenchmark.create).mockResolvedValue(MOCK_BENCHMARK as any)

    const res = await POST(makeReq('POST', { sport: 'running', metric: '5k_time', value: 1200, unit: 'seconds', testedAt: '2026-01-01' }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.benchmark.id).toBe('bm-1')
  })
})

describe('DELETE /api/progress/benchmarks', () => {
  it('retorna 404 si el benchmark no pertenece al usuario', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION_WITH_PROGRESS as any)
    vi.mocked(prisma.performanceBenchmark.findFirst).mockResolvedValue(null)

    const res = await DELETE(makeReq('DELETE', { benchmarkId: 'bm-other' }))
    expect(res.status).toBe(404)
  })

  it('elimina el benchmark propio', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION_WITH_PROGRESS as any)
    vi.mocked(prisma.performanceBenchmark.findFirst).mockResolvedValue(MOCK_BENCHMARK as any)
    vi.mocked(prisma.performanceBenchmark.delete).mockResolvedValue(MOCK_BENCHMARK as any)

    const res = await DELETE(makeReq('DELETE', { benchmarkId: 'bm-1' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})
