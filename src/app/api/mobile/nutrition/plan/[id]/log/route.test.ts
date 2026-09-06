import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/auth/mobile_auth', () => ({ getMobileUser: vi.fn() }))
vi.mock('@/lib/rate_limit', () => ({ rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/guards/feature_gate', () => ({ requireFeature: vi.fn().mockReturnValue(null) }))
vi.mock('@/domain/nutrition/calculate_food_log', () => ({
  calcMacros: vi.fn().mockReturnValue({ kcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3 }),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plannedMeal: { findFirst: vi.fn() },
    foodLog:     { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))

import { getMobileUser } from '@/lib/auth/mobile_auth'
import { prisma } from '@/lib/db/prisma'

const MOBILE_USER = {
  id: 'user-1', email: 'test@test.com', name: 'Test', role: 'ATHLETE',
  features: { nutrition: true }, onboardingCompleted: true, userPlan: 'PRO',
}

const PLANNED_MEAL = {
  id: 'pm-1', userId: 'user-1', mealType: 'BREAKFAST', grams: 100,
  date: new Date('2026-07-28'),
  food: { id: 'f1', kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
}

function makeReq(id = 'pm-1') {
  return new NextRequest(new URL(`/api/mobile/nutrition/plan/${id}/log`, 'http://localhost'), {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json', 'X-Client': 'medaliq-mobile' },
  })
}

function makeParams(id = 'pm-1') {
  return Promise.resolve({ id })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/mobile/nutrition/plan/[id]/log', () => {
  it('retorna 401 sin usuario mobile', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await POST(makeReq(), { params: makeParams() })
    expect(res.status).toBe(401)
  })

  it('retorna 404 si la comida planificada no existe o no pertenece al usuario', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(null)
    const res = await POST(makeReq(), { params: makeParams() })
    expect(res.status).toBe(404)
  })

  it('crea FoodLog nuevo y retorna 201 si no existía registro previo', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(PLANNED_MEAL as any)
    vi.mocked(prisma.foodLog.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.foodLog.create).mockResolvedValue({} as any)

    const res = await POST(makeReq(), { params: makeParams() })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.action).toBe('created')
    expect(prisma.foodLog.create).toHaveBeenCalledOnce()
  })

  it('suma gramos al FoodLog existente y retorna 200 (idempotente)', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(PLANNED_MEAL as any)
    vi.mocked(prisma.foodLog.findUnique).mockResolvedValue({ id: 'fl-1', grams: 100 } as any)
    vi.mocked(prisma.foodLog.update).mockResolvedValue({} as any)

    const res = await POST(makeReq(), { params: makeParams() })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.action).toBe('updated')
    expect(body.totalGrams).toBe(200) // 100 existing + 100 planned
    expect(prisma.foodLog.update).toHaveBeenCalledOnce()
    expect(prisma.foodLog.create).not.toHaveBeenCalled()
  })

  it('verifica ownership filtrando por userId del usuario mobile', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.plannedMeal.findFirst).mockResolvedValue(null)
    await POST(makeReq(), { params: makeParams() })
    expect(prisma.plannedMeal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'pm-1', userId: 'user-1' }),
      })
    )
  })
})
