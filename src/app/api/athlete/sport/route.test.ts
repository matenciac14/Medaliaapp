import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    healthProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const SESSION = { user: { id: 'user-1' } }

beforeEach(() => {
  vi.clearAllMocks()
})

function patchReq(body: object) {
  return new NextRequest(new URL('/api/athlete/sport', 'http://localhost'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/athlete/sport', () => {
  it('retorna null si no hay sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sport).toBeNull()
    expect(body.goal).toBeNull()
  })

  it('retorna sport y goal del perfil del usuario', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.healthProfile.findUnique).mockResolvedValue({
      sport: 'RUNNING',
      sportGoal: 'RACE_10K',
    } as any)
    const res = await GET()
    const body = await res.json()
    expect(body.sport).toBe('RUNNING')
    expect(body.goal).toBe('RACE_10K')
  })
})

// BUG-071 + UX-04: PATCH guarda meta sin generar plan
describe('PATCH /api/athlete/sport', () => {
  it('retorna 401 si no hay sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await PATCH(patchReq({ goalType: 'RACE_5K' }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 si falta goalType', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    const res = await PATCH(patchReq({}))
    expect(res.status).toBe(400)
  })

  it('guarda goalType en healthProfile y retorna ok', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.healthProfile.update).mockResolvedValue({} as any)

    const res = await PATCH(patchReq({ goalType: 'RACE_10K' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    expect(prisma.healthProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { sportGoal: 'RACE_10K' },
    })
  })

  it('guarda raceDate cuando viene en el body', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.healthProfile.update).mockResolvedValue({} as any)

    const res = await PATCH(patchReq({ goalType: 'RACE_5K', raceDate: '2026-08-15' }))
    expect(res.status).toBe(200)

    const call = vi.mocked(prisma.healthProfile.update).mock.calls[0][0]
    expect((call.data as any).raceDate).toBeInstanceOf(Date)
    expect((call.data as any).sportGoal).toBe('RACE_5K')
  })

  it('NO llama a /api/plan/new ni genera plan (BUG-071)', async () => {
    // Verificar que el endpoint PATCH no interactúa con plan generation
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.healthProfile.update).mockResolvedValue({} as any)

    await PATCH(patchReq({ goalType: 'RACE_5K' }))

    // Solo debe llamar healthProfile.update, nada de plan
    expect(prisma.healthProfile.update).toHaveBeenCalledTimes(1)
    // No hay plan creation en el mock — si se llamara, fallaría aquí
    expect(vi.mocked(prisma.healthProfile.update).mock.calls[0][0].data).not.toHaveProperty('plan')
  })
})
