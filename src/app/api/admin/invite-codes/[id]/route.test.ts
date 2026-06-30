import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    inviteCode: { findUnique: vi.fn(), delete: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const ADMIN_SESSION = { user: { id: 'admin-1' } }
const PARAMS = { params: Promise.resolve({ id: 'code-1' }) }

function deleteReq() {
  return new NextRequest(new URL('/api/admin/invite-codes/code-1', 'http://localhost'), { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/admin/invite-codes/[id]', () => {
  it('retorna 401 si no hay sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(401)
  })

  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'COACH' } as any)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(403)
  })

  it('retorna 404 si el código no existe', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.inviteCode.findUnique).mockResolvedValue(null)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(404)
  })

  it('elimina el código y retorna ok', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.inviteCode.findUnique).mockResolvedValue({ id: 'code-1' } as any)
    vi.mocked(prisma.inviteCode.delete).mockResolvedValue({} as any)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(prisma.inviteCode.delete).toHaveBeenCalledWith({ where: { id: 'code-1' } })
  })
})
