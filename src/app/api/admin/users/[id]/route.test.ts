import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), delete: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}))
vi.mock('@/lib/admin/log-action', () => ({ logAdminAction: vi.fn().mockResolvedValue(undefined) }))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { logAdminAction } from '@/lib/admin/log-action'

const ADMIN_SESSION = { user: { id: 'admin-1' } }
const TARGET_USER = { id: 'user-2', name: 'Ana López', email: 'ana@test.com', role: 'ATHLETE' }
const PARAMS = { params: Promise.resolve({ id: 'user-2' }) }

function deleteReq() {
  return new NextRequest(new URL('/api/admin/users/user-2', 'http://localhost'), { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/admin/users/[id]', () => {
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

  it('retorna 400 si el admin intenta eliminarse a sí mismo', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-2' } } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('eliminarte')
  })

  it('retorna 404 si el usuario objetivo no existe', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as any)
      .mockResolvedValueOnce(null)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(404)
  })

  it('registra el audit log ANTES de eliminar', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as any)
      .mockResolvedValueOnce(TARGET_USER as any)
    vi.mocked(prisma.user.delete).mockResolvedValue({} as any)

    const callOrder: string[] = []
    vi.mocked(logAdminAction).mockImplementation(async () => { callOrder.push('audit') })
    vi.mocked(prisma.user.delete).mockImplementation(async () => { callOrder.push('delete'); return {} as any })

    await DELETE(deleteReq(), PARAMS)
    expect(callOrder).toEqual(['audit', 'delete'])
  })

  it('incluye email, nombre y rol en el meta del audit log', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as any)
      .mockResolvedValueOnce(TARGET_USER as any)
    vi.mocked(prisma.user.delete).mockResolvedValue({} as any)

    await DELETE(deleteReq(), PARAMS)

    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-1',
      'DELETE_USER',
      'user-2',
      { email: TARGET_USER.email, name: TARGET_USER.name, role: TARGET_USER.role }
    )
  })

  it('elimina el usuario y retorna ok', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as any)
      .mockResolvedValueOnce(TARGET_USER as any)
    vi.mocked(prisma.user.delete).mockResolvedValue({} as any)

    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } })
  })
})
