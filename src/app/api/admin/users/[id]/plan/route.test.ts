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
  return new NextRequest(new URL('/api/admin/users/user-2/plan', 'http://localhost'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const PRO_USER = { id: 'user-2', role: 'ATHLETE', featurePlan: true, featureCoach: false, onboardingCompleted: true }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/admin/users/[id]/plan', () => {
  it('retorna 401 si no hay sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await PATCH(patchReq({ plan: 'PRO' }), PARAMS)
    expect(res.status).toBe(401)
  })

  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ATHLETE' } as any)
    const res = await PATCH(patchReq({ plan: 'PRO' }), PARAMS)
    expect(res.status).toBe(403)
  })

  it('asigna plan PRO con todas las features activas', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue(PRO_USER as any)

    const res = await PATCH(patchReq({ plan: 'PRO' }), PARAMS)
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'ATHLETE',
          featurePlan: true,
          featureCheckin: true,
          featureNutrition: true,
          featureGym: true,
          featureCoach: false,
        }),
      })
    )
  })

  it('asigna plan FREE con solo featureLog activo', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...PRO_USER, featurePlan: false } as any)

    await PATCH(patchReq({ plan: 'FREE' }), PARAMS)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'ATHLETE',
          featurePlan: false,
          featureLog: true,
          featureCoach: false,
        }),
      })
    )
  })

  it('asigna plan COACH convirtiendo al usuario en COACH', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...PRO_USER, role: 'COACH', featureCoach: true } as any)

    await PATCH(patchReq({ plan: 'COACH' }), PARAMS)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'COACH',
          featureCoach: true,
          onboardingCompleted: true,
        }),
      })
    )
  })

  it('registra el audit log con el plan asignado', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue(PRO_USER as any)

    await PATCH(patchReq({ plan: 'PRO' }), PARAMS)

    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-1',
      'CHANGE_PLAN',
      'user-2',
      { plan: 'PRO' }
    )
  })

  it('retorna ok: true con datos del usuario actualizado', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue(PRO_USER as any)

    const res = await PATCH(patchReq({ plan: 'PRO' }), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.user).toBeDefined()
  })
})
