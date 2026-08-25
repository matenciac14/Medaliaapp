import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    coachAthlete: { findFirst: vi.fn() },
    plannedMeal:  { findMany: vi.fn(), create: vi.fn() },
    food:         { findFirst: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const COACH = { user: { id: 'coach-1', role: 'COACH' } }
const ATHLETE_ID = 'athlete-1'

function makeGetReq(qs = '') {
  return new NextRequest(new URL(`/api/coach/athlete/${ATHLETE_ID}/nutrition/plan${qs}`, 'http://localhost'))
}

function makePostReq(body: unknown) {
  return new NextRequest(new URL(`/api/coach/athlete/${ATHLETE_ID}/nutrition/plan`, 'http://localhost'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeParams(id = ATHLETE_ID) {
  return Promise.resolve({ id })
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/coach/athlete/[id]/nutrition/plan', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET(makeGetReq(), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 401 si rol no es COACH', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'ATHLETE' } } as any)
    const res = await GET(makeGetReq(), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el coach no tiene relación con el atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    const res = await GET(makeGetReq(), { params: makeParams() })
    expect(res.status).toBe(403)
  })

  it('retorna las comidas agrupadas por fecha', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    const meal = {
      id: 'pm-1', mealType: 'BREAKFAST', grams: 100, date: new Date('2026-07-28'),
      food: { id: 'f1', name: 'Arroz', category: 'GRAINS', kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, servingG: 100, servingLabel: null },
      overrides: [],
    }
    vi.mocked(prisma.plannedMeal.findMany).mockResolvedValue([meal] as any)

    const res = await GET(makeGetReq('?week=2026-07-28'), { params: makeParams() })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meals).toHaveProperty('2026-07-28')
    expect(body.meals['2026-07-28']).toHaveLength(1)
  })
})

describe('POST /api/coach/athlete/[id]/nutrition/plan', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(makePostReq({}), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el coach no tiene relación con el atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    const res = await POST(
      makePostReq({ date: '2026-07-28', mealType: 'BREAKFAST', foodId: 'f1', grams: 100 }),
      { params: makeParams() }
    )
    expect(res.status).toBe(403)
  })

  it('retorna 400 si faltan campos requeridos', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    const res = await POST(makePostReq({ date: '2026-07-28' }), { params: makeParams() })
    expect(res.status).toBe(400)
  })

  it('retorna 400 con mealType inválido', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.food.findFirst).mockResolvedValue({ id: 'f1' } as any)
    const res = await POST(
      makePostReq({ date: '2026-07-28', mealType: 'INVALID', foodId: 'f1', grams: 100 }),
      { params: makeParams() }
    )
    expect(res.status).toBe(400)
  })

  it('retorna 404 si el alimento no existe', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.food.findFirst).mockResolvedValue(null)
    const res = await POST(
      makePostReq({ date: '2026-07-28', mealType: 'BREAKFAST', foodId: 'nonexistent', grams: 100 }),
      { params: makeParams() }
    )
    expect(res.status).toBe(404)
  })

  it('crea el PlannedMeal y retorna 201', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.food.findFirst).mockResolvedValue({ id: 'f1' } as any)
    const created = { id: 'pm-1', mealType: 'BREAKFAST', grams: 100, food: { id: 'f1', name: 'Arroz' } }
    vi.mocked(prisma.plannedMeal.create).mockResolvedValue(created as any)

    const res = await POST(
      makePostReq({ date: '2026-07-28', mealType: 'BREAKFAST', foodId: 'f1', grams: 100 }),
      { params: makeParams() }
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.meal.id).toBe('pm-1')
    // Verifica que se creó con userId = athleteId (no coachId)
    expect(prisma.plannedMeal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: ATHLETE_ID }),
      })
    )
  })
})
