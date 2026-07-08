import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    exercise: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    workoutExercise: { count: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const ADMIN_SESSION = { user: { id: 'admin-1' } }
const PARAMS = { params: Promise.resolve({ id: 'ex-1' }) }

const VALID_BODY = {
  name: 'Sentadilla',
  bodyPart: 'upper legs',
  target: 'quads',
  equipment: 'barbell',
}

function patchReq(body: unknown) {
  return new NextRequest(new URL('/api/admin/exercises/ex-1', 'http://localhost'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteReq() {
  return new NextRequest(new URL('/api/admin/exercises/ex-1', 'http://localhost'), { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/admin/exercises/[id]', () => {
  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await PATCH(patchReq(VALID_BODY), PARAMS)
    expect(res.status).toBe(403)
  })

  it('retorna 404 si el ejercicio no existe', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue(null)
    const res = await PATCH(patchReq(VALID_BODY), PARAMS)
    expect(res.status).toBe(404)
  })

  it('retorna 404 si el ejercicio pertenece a un coach', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue({ coachId: 'coach-x' } as any)
    const res = await PATCH(patchReq(VALID_BODY), PARAMS)
    expect(res.status).toBe(404)
  })

  it('retorna 400 si el body es inválido', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue({ coachId: null } as any)
    const res = await PATCH(patchReq({ name: '', bodyPart: '', target: '', equipment: '' }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('actualiza y retorna el ejercicio', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue({ coachId: null } as any)
    vi.mocked(prisma.exercise.update).mockResolvedValue({ id: 'ex-1', ...VALID_BODY } as any)
    const res = await PATCH(patchReq(VALID_BODY), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.exercise.id).toBe('ex-1')
  })
})

describe('DELETE /api/admin/exercises/[id]', () => {
  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(403)
  })

  it('retorna 404 si el ejercicio no existe', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue(null)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(404)
  })

  it('retorna 404 si el ejercicio pertenece a un coach', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue({ coachId: 'coach-x' } as any)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(404)
  })

  it('retorna 409 si el ejercicio está en uso', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue({ coachId: null } as any)
    vi.mocked(prisma.workoutExercise.count).mockResolvedValue(3)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(409)
    expect(prisma.exercise.delete).not.toHaveBeenCalled()
  })

  it('elimina el ejercicio y retorna ok', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.findUnique).mockResolvedValue({ coachId: null } as any)
    vi.mocked(prisma.workoutExercise.count).mockResolvedValue(0)
    vi.mocked(prisma.exercise.delete).mockResolvedValue({} as any)
    const res = await DELETE(deleteReq(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(prisma.exercise.delete).toHaveBeenCalledWith({ where: { id: 'ex-1' } })
  })
})
