import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    verificationToken: {
      findUnique: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { prisma } from '@/lib/db/prisma'
import { GET } from './route'

function req(token?: string) {
  const url = token
    ? `http://localhost/api/auth/verify-email?token=${token}`
    : 'http://localhost/api/auth/verify-email'
  return new NextRequest(new URL(url))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/auth/verify-email', () => {
  it('redirige a /login?error=token-invalido si no hay token', async () => {
    const res = await GET(req())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=token-invalido')
  })

  it('redirige a error si el token no existe en DB', async () => {
    vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null)
    const res = await GET(req('bad-token'))
    expect(res.headers.get('location')).toContain('error=token-invalido')
  })

  it('redirige a error y elimina token si expiró', async () => {
    vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
      token: 'expired-token',
      identifier: 'ana@test.com',
      expires: new Date(Date.now() - 3600_000), // 1h ago
    } as any)

    const res = await GET(req('expired-token'))
    expect(res.headers.get('location')).toContain('error=token-expirado')
    expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: 'expired-token' },
    })
  })

  it('redirige a error si el usuario no existe', async () => {
    vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
      token: 'valid-token',
      identifier: 'ghost@test.com',
      expires: new Date(Date.now() + 3600_000),
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await GET(req('valid-token'))
    expect(res.headers.get('location')).toContain('error=usuario-no-encontrado')
  })

  it('verifica email, elimina token y redirige a /login?verified=1', async () => {
    vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
      token: 'valid-token',
      identifier: 'ana@test.com',
      expires: new Date(Date.now() + 3600_000),
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      emailVerified: null,
    } as any)

    const res = await GET(req('valid-token'))
    expect(res.headers.get('location')).toContain('verified=1')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerified: expect.any(Date) },
    })
    expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: 'valid-token' },
    })
  })
})
