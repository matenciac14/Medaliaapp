import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    inviteCode: { findMany: vi.fn(), create: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const ADMIN_SESSION = { user: { id: 'admin-1' } }

function postReq(body: unknown) {
  return new NextRequest(new URL('/api/admin/invite-codes', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/invite-codes', () => {
  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('retorna la lista de códigos', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const codes = [{ id: 'c1', code: 'MEDAL-ABC123', usedBy: null, usedAt: null, expiresAt: new Date(), createdAt: new Date(), coach: { id: 'coach-1', name: 'Coach A', email: 'coach@test.com' } }]
    vi.mocked(prisma.inviteCode.findMany).mockResolvedValue(codes as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.codes).toHaveLength(1)
  })
})

describe('POST /api/admin/invite-codes', () => {
  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(postReq({ coachId: 'c1' }))
    expect(res.status).toBe(403)
  })

  it('retorna 400 si falta coachId', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
  })

  it('retorna 400 si el usuario no es COACH', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as any)
      .mockResolvedValueOnce({ role: 'ATHLETE' } as any)
    const res = await POST(postReq({ coachId: 'c1' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('coach')
  })

  it('retorna 400 si el coach no existe', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as any)
      .mockResolvedValueOnce(null)
    const res = await POST(postReq({ coachId: 'c1' }))
    expect(res.status).toBe(400)
  })

  it('crea y retorna el invite code', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as any)
      .mockResolvedValueOnce({ role: 'COACH' } as any)
    const invite = { id: 'inv-1', code: 'MEDAL-XYZ789', expiresAt: new Date() }
    vi.mocked(prisma.inviteCode.create).mockResolvedValue(invite as any)
    const res = await POST(postReq({ coachId: 'c1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invite.code).toMatch(/^MEDAL-/)
  })
})
