import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/mobile-auth', () => ({
  getMobileUser: vi.fn(),
  signMobileToken: vi.fn(),
}))
vi.mock('@/lib/rate-limit', () => ({
  rateLimitAsync: vi.fn(),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

import { getMobileUser, signMobileToken } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { prisma } from '@/lib/db/prisma'

const MOBILE_USER = { id: 'user-1', email: 'test@test.com', role: 'ATHLETE' }

const DB_USER = {
  id: 'user-1',
  email: 'test@test.com',
  name: 'Test User',
  role: 'ATHLETE',
  featurePlan: true,
  featureCheckin: true,
  featureNutrition: true,
  featureProgress: true,
  featureLog: true,
  featureCoach: false,
  featureGym: true,
  onboardingCompleted: true,
}

function makeReq() {
  return new NextRequest(new URL('/api/mobile/auth/refresh', 'http://localhost'), {
    method: 'POST',
    headers: { 'X-Client': 'medaliq-mobile', 'Authorization': 'Bearer token' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: true } as any)
})

describe('POST /api/mobile/auth/refresh', () => {
  it('retorna 401 si no hay token válido', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
  })

  it('retorna 429 si se excede el rate limit', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(rateLimitAsync).mockResolvedValue({ allowed: false } as any)
    const res = await POST(makeReq())
    expect(res.status).toBe(429)
  })

  it('retorna 404 si el usuario no existe en DB', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(404)
  })

  it('retorna 200 con token y features actualizadas', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(DB_USER as any)
    vi.mocked(signMobileToken).mockResolvedValue('new-jwt-token')

    const res = await POST(makeReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.token).toBe('new-jwt-token')
    expect(body.features).toEqual({
      plan: true, checkin: true, nutrition: true,
      progress: true, log: true, coach: false, gym: true,
    })
  })

  it('llama signMobileToken con features frescas de DB', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...DB_USER, featurePlan: false, featureCheckin: false,
    } as any)
    vi.mocked(signMobileToken).mockResolvedValue('token-b2b')

    await POST(makeReq())

    expect(signMobileToken).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        features: expect.objectContaining({ plan: false, checkin: false }),
      })
    )
  })
})
