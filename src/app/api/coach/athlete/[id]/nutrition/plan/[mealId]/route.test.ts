import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    coachAthlete: { findFirst: vi.fn() },
    plannedMeal:  { findFirst: vi.fn(), delete: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const COACH = { user: { id: 'coach-1', role: 'COACH' } }
const ATHLETE_ID = 'athlete-1'
const MEAL_ID = 'pm-1'

function makeParams(id = ATHLETE_ID, mealId = MEAL_ID) {
  return Promise.resolve({ id, mealId })
}

beforeEach(() => vi.clearAllMocks())

describe('DELETE /api/coach/athlete/[id]/nutrition/plan/[mealId]', () => {
  it('retorna 401 sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await DELETE(new Request('http://localhost'), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 401 si rol no es COACH', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'ATHLETE' } } as any)
    const res = await DELETE(new Request('http://localhost'), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el coach no tiene relación con el atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost'), { params: makeParams() })
    expect(res.status).toBe(403)
  })

  it('retorna 404 si la comida no existe o no pertenece al atleta', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost'), { params: makeParams() })
    expect(res.status).toBe(404)
  })

  it('elimina la comida y retorna 200', async () => {
    vi.mocked(auth).mockResolvedValue(COACH as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue({ id: MEAL_ID } as any)
    vi.mocked(prisma.plannedMeal.delete).mockResolvedValue({} as any)

    const res = await DELETE(new Request('http://localhost'), { params: makeParams() })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(prisma.plannedMeal.delete).toHaveBeenCalledWith({ where: { id: MEAL_ID } })
  })
})
