import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    nutritionPlan: { findUnique: vi.fn(), update: vi.fn() },
    coachAthlete: { findFirst: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const SESSION = { user: { id: 'user-1' } }

const PLAN = {
  id: 'np-1', userId: 'user-1', source: 'SYSTEM',
  tdee: 2500, targetKcalHard: 2800, targetKcalEasy: 2200, targetKcalRest: 2000,
  proteinG: 150, carbsHardG: 350, carbsEasyG: 250, fatG: 70,
}

function makeReq(body: object) {
  return new NextRequest(new URL('http://localhost/api/athlete/nutrition/targets'), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => vi.clearAllMocks())

// ──────────────────────────────────────────
// GET
// ──────────────────────────────────────────
describe('GET /api/athlete/nutrition/targets', () => {
  it('retorna 401 sin sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna 404 si no tiene NutritionPlan', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(404)
  })

  it('retorna el plan del atleta', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(PLAN as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan.targetKcalHard).toBe(2800)
  })
})

// ──────────────────────────────────────────
// PATCH
// ──────────────────────────────────────────
describe('PATCH /api/athlete/nutrition/targets', () => {
  it('retorna 401 sin sesion', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }))
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el atleta tiene coach activo (B2B)', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'ca-1' } as any)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain('coach')
  })

  it('retorna 400 si no hay campos validos', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    const res = await PATCH(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('retorna 404 si no tiene NutritionPlan', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(null)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }))
    expect(res.status).toBe(404)
  })

  it('actualiza targets y retorna source=ATHLETE', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(PLAN as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, targetKcalHard: 3000, source: 'ATHLETE' } as any)
    const res = await PATCH(makeReq({ targetKcalHard: 3000 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan.source).toBe('ATHLETE')
    expect(prisma.nutritionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'ATHLETE', targetKcalHard: 3000 }),
      })
    )
  })

  it('no incluye campos no enviados en data', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.nutritionPlan.findUnique).mockResolvedValue(PLAN as any)
    vi.mocked(prisma.nutritionPlan.update).mockResolvedValue({ ...PLAN, proteinG: 180, source: 'ATHLETE' } as any)
    await PATCH(makeReq({ proteinG: 180 }))
    const call = vi.mocked(prisma.nutritionPlan.update).mock.calls[0]![0]
    expect(call.data).not.toHaveProperty('targetKcalHard')
    expect(call.data).toHaveProperty('proteinG', 180)
    expect(call.data).toHaveProperty('source', 'ATHLETE')
  })
})
