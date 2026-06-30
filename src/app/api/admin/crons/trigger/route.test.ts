import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const ADMIN_SESSION = { user: { id: 'admin-1' } }

function postReq(body: unknown) {
  return new NextRequest(new URL('/api/admin/crons/trigger', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('POST /api/admin/crons/trigger', () => {
  it('retorna 401 si no hay sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(postReq({ cron: 'checkin-reminder' }))
    expect(res.status).toBe(401)
  })

  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ATHLETE' } as any)
    const res = await POST(postReq({ cron: 'checkin-reminder' }))
    expect(res.status).toBe(403)
  })

  it('retorna 400 si el cron no es válido', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const res = await POST(postReq({ cron: 'cron-inventado' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('válido')
  })

  it('retorna 500 si CRON_SECRET no está configurado', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.stubEnv('CRON_SECRET', '')
    const res = await POST(postReq({ cron: 'checkin-reminder' }))
    expect(res.status).toBe(500)
  })

  it('llama a la URL del cron con Authorization header', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.stubEnv('CRON_SECRET', 'secret-test')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ processed: 5 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const res = await POST(postReq({ cron: 'checkin-reminder' }))
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/cron/checkin-reminder',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer secret-test' }),
      })
    )
  })

  it('retorna 502 si el cron falla', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.stubEnv('CRON_SECRET', 'secret-test')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'internal' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const res = await POST(postReq({ cron: 'payment-overdue' }))
    expect(res.status).toBe(502)
  })

  it('retorna 502 si fetch lanza una excepción', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.stubEnv('CRON_SECRET', 'secret-test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const res = await POST(postReq({ cron: 'session-reminder' }))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toContain('Error')
  })

  it('acepta todos los crons válidos', async () => {
    const validCrons = ['checkin-reminder', 'session-reminder', 'payment-overdue']
    for (const cron of validCrons) {
      vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
      vi.stubEnv('CRON_SECRET', 'sec')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }))
      const res = await POST(postReq({ cron }))
      expect(res.status).toBe(200)
    }
  })
})
