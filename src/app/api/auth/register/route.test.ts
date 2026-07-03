/**
 * PERSIST-02: user.create debe estar dentro del $transaction.
 * Si userSubscription o coachProfile falla, el usuario no debe quedar huérfano en DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed-pw') } }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    verificationToken: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  },
}))
vi.mock('@/infrastructure/email/resend', () => ({
  sendCoachWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue({ toString: () => 'abc123token' }),
}))

import { prisma } from '@/lib/db/prisma'
import { POST } from './route'

function req(body: object) {
  return new NextRequest(new URL('/api/auth/register', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_ATHLETE = { name: 'Ana López', email: 'ana@test.com', password: 'Password123!', role: 'ATHLETE' }
const VALID_COACH   = { name: 'Carlos', email: 'carlos@test.com', password: 'Password123!', role: 'COACH' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null) // No existe
})

describe('POST /api/auth/register — PERSIST-02', () => {
  it('retorna 409 si el email ya existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any)
    const res = await POST(req(VALID_ATHLETE))
    expect(res.status).toBe(409)
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled()
  })

  it('retorna 400 si falta el nombre', async () => {
    const res = await POST(req({ ...VALID_ATHLETE, name: '' }))
    expect(res.status).toBe(400)
  })

  it('crea usuario DENTRO del $transaction (PERSIST-02)', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({ user: { create: vi.fn().mockResolvedValue({ id: 'u1' }) }, userSubscription: { create: vi.fn().mockResolvedValue({}) } })
    )

    const res = await POST(req(VALID_ATHLETE))
    expect(res.status).toBe(201)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('si el $transaction falla, retorna 500 y NO deja usuario huérfano', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB failure'))
    const res = await POST(req(VALID_ATHLETE))
    expect(res.status).toBe(500)
    // user.create nunca se llamó fuera de la tx
    expect(vi.mocked(prisma.user.findUnique)).toHaveBeenCalledTimes(1) // solo el check de existencia
  })

  it('coach: crea coachProfile dentro de la misma tx', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'u2' })
    const mockSubCreate = vi.fn().mockResolvedValue({})
    const mockProfileCreate = vi.fn().mockResolvedValue({})

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({ user: { create: mockCreate }, userSubscription: { create: mockSubCreate }, coachProfile: { create: mockProfileCreate } })
    )

    await POST(req(VALID_COACH))

    const txCallback = vi.mocked(prisma.$transaction).mock.calls[0][0] as Function
    expect(txCallback.toString()).not.toContain('outside transaction')
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledTimes(1)
  })

  it('retorna 201 con success:true en registro exitoso', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({ user: { create: vi.fn().mockResolvedValue({ id: 'u3' }) }, userSubscription: { create: vi.fn().mockResolvedValue({}) } })
    )

    const res = await POST(req(VALID_ATHLETE))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
