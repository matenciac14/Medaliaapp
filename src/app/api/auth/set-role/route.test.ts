import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { update: vi.fn() } },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { POST } from './route'

function req(body: object) {
  return new NextRequest(new URL('/api/auth/set-role', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.update).mockResolvedValue({} as any)
})

describe('POST /api/auth/set-role', () => {
  it('retorna 401 si no hay sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(req({ role: 'ATHLETE' }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 si el rol es inválido', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    const res = await POST(req({ role: 'ADMIN' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si falta el campo role', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('asigna rol ATHLETE y retorna 200', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any)
    const res = await POST(req({ role: 'ATHLETE' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.role).toBe('ATHLETE')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, data: expect.objectContaining({ role: 'ATHLETE', needsRoleSelection: false }) })
    )
  })

  it('asigna rol COACH con features de coach y retorna 200', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u2' } } as any)
    const res = await POST(req({ role: 'COACH' }))
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'COACH',
          featureCoach: true,
          featurePlan: false,
          onboardingCompleted: true,
        }),
      })
    )
  })
})
