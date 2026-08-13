import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/mobile-auth', () => ({ getMobileUser: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/guards/feature-gate', () => ({ requireFeature: vi.fn().mockReturnValue(null) }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: { plannedMeal: { findMany: vi.fn() } },
}))

import { getMobileUser } from '@/lib/mobile-auth'
import { prisma } from '@/lib/db/prisma'

const MOBILE_USER = {
  id: 'user-1', email: 'test@test.com', name: 'Test', role: 'ATHLETE',
  features: { nutrition: true }, onboardingCompleted: true, userPlan: 'PRO',
}

function makeReq(qs = '') {
  return new NextRequest(new URL(`/api/mobile/nutrition/plan${qs}`, 'http://localhost'), {
    headers: { 'X-Client': 'medaliq-mobile' },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/mobile/nutrition/plan', () => {
  it('retorna 401 sin usuario mobile', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('retorna 200 con lista vacía si no hay PlannedMeals', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.plannedMeal.findMany).mockResolvedValue([])
    const res = await GET(makeReq('?date=2026-07-28'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.date).toBe('2026-07-28')
    expect(body.meals).toEqual([])
  })

  it('filtra por userId y rango del día solicitado', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.plannedMeal.findMany).mockResolvedValue([])
    await GET(makeReq('?date=2026-07-28'))
    expect(prisma.plannedMeal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      })
    )
  })

  it('retorna las comidas planificadas del día', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    const meal = {
      id: 'pm-1', mealType: 'BREAKFAST', grams: 100, date: new Date('2026-07-28'),
      food: { id: 'f1', name: 'Arroz', category: 'GRAINS', kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, servingG: 100, servingLabel: null },
    }
    vi.mocked(prisma.plannedMeal.findMany).mockResolvedValue([meal] as any)
    const res = await GET(makeReq('?date=2026-07-28'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meals).toHaveLength(1)
    expect(body.meals[0].id).toBe('pm-1')
  })
})
