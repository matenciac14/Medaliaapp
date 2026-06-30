import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    exercise: { findMany: vi.fn(), create: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const ADMIN_SESSION = { user: { id: 'admin-1' } }

function jsonReq(body: unknown, method = 'POST') {
  return new NextRequest(new URL('/api/admin/exercises', 'http://localhost'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_EXERCISE = {
  name: 'Sentadilla',
  category: 'COMPOUND',
  equipment: 'BARBELL',
  muscleGroups: ['QUADRICEPS', 'GLUTES'],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/exercises', () => {
  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('retorna la lista de ejercicios globales', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const exercises = [{ id: 'ex1', name: 'Sentadilla', category: 'COMPOUND', equipment: 'BARBELL', muscleGroups: ['QUADRICEPS'], description: null, tips: null, isGlobal: true }]
    vi.mocked(prisma.exercise.findMany).mockResolvedValue(exercises as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.exercises).toEqual(exercises)
  })
})

describe('POST /api/admin/exercises', () => {
  it('retorna 403 si no es admin', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(jsonReq(VALID_EXERCISE))
    expect(res.status).toBe(403)
  })

  it('retorna 400 con errores si el body es inválido', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const res = await POST(jsonReq({ name: '', category: 'COMPOUND', equipment: 'BARBELL', muscleGroups: [] }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.errors).toBeInstanceOf(Array)
    expect(body.errors.length).toBeGreaterThan(0)
  })

  it('crea y retorna el ejercicio con status 201', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const created = { id: 'new-ex', ...VALID_EXERCISE }
    vi.mocked(prisma.exercise.create).mockResolvedValue(created as any)
    const res = await POST(jsonReq(VALID_EXERCISE))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.exercise.id).toBe('new-ex')
  })

  it('crea con coachId null e isGlobal true', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.exercise.create).mockResolvedValue({ id: 'x' } as any)
    await POST(jsonReq(VALID_EXERCISE))
    expect(prisma.exercise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ coachId: null, isGlobal: true }),
      })
    )
  })
})
