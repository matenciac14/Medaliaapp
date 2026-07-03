/**
 * PERSIST-10: el update de dailyLog no debe sobreescribir campos con null
 * cuando el cliente solo envía algunos campos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    dailyLog: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: 'log-1' }),
    },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { POST } from './route'

const SESSION = { user: { id: 'user-1' } }

function postReq(body: object) {
  return new NextRequest(new URL('/api/metrics/log', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(SESSION as any)
})

describe('POST /api/metrics/log — PERSIST-10', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(postReq({ date: '2026-07-03', weightKg: 75 }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 si falta date', async () => {
    const res = await POST(postReq({ weightKg: 75 }))
    expect(res.status).toBe(400)
  })

  it('el campo update NO incluye campos no enviados (PERSIST-10)', async () => {
    // Solo enviamos peso — sleepHours/energyLevel no deben ir en el update
    await POST(postReq({ date: '2026-07-03', weightKg: 75 }))

    const upsertCall = vi.mocked(prisma.dailyLog.upsert).mock.calls[0][0]
    expect(upsertCall.update).toHaveProperty('weightKg', 75)
    expect(upsertCall.update).not.toHaveProperty('sleepHours')
    expect(upsertCall.update).not.toHaveProperty('energyLevel')
    expect(upsertCall.update).not.toHaveProperty('hrResting')
  })

  it('incluye solo los campos enviados en el update', async () => {
    await POST(postReq({ date: '2026-07-03', sleepHours: 7.5, energyLevel: 8 }))

    const upsertCall = vi.mocked(prisma.dailyLog.upsert).mock.calls[0][0]
    expect(upsertCall.update).toEqual({ sleepHours: 7.5, energyLevel: 8 })
    expect(upsertCall.update).not.toHaveProperty('weightKg')
  })

  it('el create sí usa null para campos no enviados (inicialización)', async () => {
    await POST(postReq({ date: '2026-07-03', weightKg: 75 }))

    const upsertCall = vi.mocked(prisma.dailyLog.upsert).mock.calls[0][0]
    expect(upsertCall.create).toHaveProperty('sleepHours', null)
    expect(upsertCall.create).toHaveProperty('energyLevel', null)
  })

  it('retorna el log upsertado', async () => {
    const res = await POST(postReq({ date: '2026-07-03', weightKg: 75 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('log-1')
  })
})
