import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}))
vi.mock('@/lib/admin/log-action', () => ({ logAdminAction: vi.fn().mockResolvedValue(undefined) }))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { logAdminAction } from '@/lib/admin/log-action'

const ADMIN_SESSION = { user: { id: 'admin-1' } }
const PARAMS = { params: Promise.resolve({ id: 'user-2' }) }

function patchReq(body: unknown) {
  return new NextRequest(new URL('/api/admin/user/user-2/role', 'http://localhost'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/admin/user/[id]/role', () => {
  it('retorna 401 si no hay sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await PATCH(patchReq({ role: 'COACH' }), PARAMS)
    expect(res.status).toBe(401)
  })

  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ATHLETE' } as any)
    const res = await PATCH(patchReq({ role: 'COACH' }), PARAMS)
    expect(res.status).toBe(403)
  })

  it('retorna 400 si el rol no es válido', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const res = await PATCH(patchReq({ role: 'SUPERADMIN' }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('acepta los roles válidos: ATHLETE, COACH, ADMIN', async () => {
    for (const role of ['ATHLETE', 'COACH', 'ADMIN']) {
      vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
      vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-2', role } as any)
      const res = await PATCH(patchReq({ role }), PARAMS)
      expect(res.status).toBe(200)
    }
  })

  it('actualiza el usuario con las features del nuevo rol', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)
    await PATCH(patchReq({ role: 'ATHLETE' }), PARAMS)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'ATHLETE',
          featurePlan: true,
          featureCoach: false,
        }),
      })
    )
  })

  it('activa onboardingCompleted al asignar rol COACH', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)
    await PATCH(patchReq({ role: 'COACH' }), PARAMS)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ onboardingCompleted: true, featureCoach: true }),
      })
    )
  })

  it('registra el audit log con el rol anterior y nuevo', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'ADMIN' } as any)   // admin check
      .mockResolvedValueOnce({ role: 'ATHLETE' } as any) // read previous role
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    await PATCH(patchReq({ role: 'COACH' }), PARAMS)

    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-1',
      'CHANGE_ROLE',
      'user-2',
      { from: 'ATHLETE', to: 'COACH' }
    )
  })

  it('retorna ok: true', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)
    const res = await PATCH(patchReq({ role: 'ATHLETE' }), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
