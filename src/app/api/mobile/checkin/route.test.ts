import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/mobile-auth', () => ({ getMobileUser: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/core/week-number', () => ({
  getPlanWeekNumber: vi.fn().mockReturnValue(3),
  getCurrentISOWeek: vi.fn().mockReturnValue(28),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    trainingPlan: { findFirst: vi.fn() },
    weeklyCheckIn: { findFirst: vi.fn() },
    checkInSuggestion: { findMany: vi.fn() },
    healthProfile: { findUnique: vi.fn() },
  },
}))

import { getMobileUser } from '@/lib/mobile-auth'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { GET } from './route'

const MOBILE_USER = {
  id: 'u1',
  email: 'test@test.com',
  name: 'Test',
  role: 'ATHLETE',
  features: {},
  onboardingCompleted: true,
  userPlan: 'PRO',
}

function getReq() {
  return new NextRequest(new URL('/api/mobile/checkin', 'http://localhost'), {
    headers: { 'X-Client': 'medaliq-mobile' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.weeklyCheckIn.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.checkInSuggestion.findMany).mockResolvedValue([])
  vi.mocked(prisma.healthProfile.findUnique).mockResolvedValue(null)
})

describe('GET /api/mobile/checkin', () => {
  it('retorna 401 sin usuario mobile', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('retorna weekNumber desde plan activo con totalWeeks', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({
      startDate: new Date('2026-07-01'),
      totalWeeks: 8,
      weeks: [],
    } as any)

    const res = await GET(getReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.weekNumber).toBe(3)
    expect(body.totalWeeks).toBe(8)
    expect(body.submitted).toBe(false)
    expect(getPlanWeekNumber).toHaveBeenCalledWith(expect.any(Date), 8)
  })

  it('retorna totalWeeks: null sin plan activo', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue(null)

    const res = await GET(getReq())
    const body = await res.json()

    expect(body.totalWeeks).toBeNull()
    expect(body.weekSessions).toEqual([])
  })

  it('retorna weekSessions filtrando DESCANSO', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({
      startDate: new Date('2026-07-01'),
      totalWeeks: 8,
      weeks: [
        {
          weekNumber: 3,
          sessions: [
            { dayOfWeek: 1, type: 'CARRERA', log: { id: 'log1' } },
            { dayOfWeek: 2, type: 'FUERZA', log: null },
            { dayOfWeek: 3, type: 'DESCANSO', log: null },
            { dayOfWeek: 4, type: 'CARRERA', log: { id: 'log2' } },
          ],
        },
      ],
    } as any)

    const res = await GET(getReq())
    const body = await res.json()

    expect(body.weekSessions).toHaveLength(3) // DESCANSO filtered
    expect(body.weekSessions).toEqual([
      { dayOfWeek: 1, completed: true },
      { dayOfWeek: 2, completed: false },
      { dayOfWeek: 4, completed: true },
    ])
  })

  it('retorna hasAutoData: true cuando healthProfile tiene weightKg', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.healthProfile.findUnique).mockResolvedValue({
      weightKg: 72.5,
      hrResting: null,
    } as any)

    const res = await GET(getReq())
    const body = await res.json()

    expect(body.hasAutoData).toBe(true)
  })

  it('retorna hasAutoData: true cuando healthProfile tiene hrResting', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.healthProfile.findUnique).mockResolvedValue({
      weightKg: null,
      hrResting: 58,
    } as any)

    const res = await GET(getReq())
    const body = await res.json()

    expect(body.hasAutoData).toBe(true)
  })

  it('retorna hasAutoData: false sin healthProfile', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.healthProfile.findUnique).mockResolvedValue(null)

    const res = await GET(getReq())
    const body = await res.json()

    expect(body.hasAutoData).toBe(false)
  })

  it('retorna submitted: true cuando existe check-in esta semana', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.weeklyCheckIn.findFirst).mockResolvedValue({
      id: 'ci1',
      weightKg: 72,
      hrResting: 58,
      sleepHours: 7,
      sleepScore: null,
      energyLevel: 7,
      stressLevel: 3,
      motivationLevel: 8,
      hardestSessionRpe: 6,
      painLevel: null,
      notes: null,
      recordedAt: new Date(),
    } as any)

    const res = await GET(getReq())
    const body = await res.json()

    expect(body.submitted).toBe(true)
    expect(body.data).not.toBeNull()
    expect(body.data.id).toBe('ci1')
  })

  it('retorna weekSessions vacío si la semana actual no existe en el plan', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
    vi.mocked(prisma.trainingPlan.findFirst).mockResolvedValue({
      startDate: new Date('2026-07-01'),
      totalWeeks: 8,
      weeks: [
        { weekNumber: 1, sessions: [{ dayOfWeek: 1, type: 'CARRERA', log: null }] },
        { weekNumber: 2, sessions: [{ dayOfWeek: 1, type: 'CARRERA', log: null }] },
        // weekNumber 3 not present
      ],
    } as any)

    const res = await GET(getReq())
    const body = await res.json()

    expect(body.weekSessions).toEqual([])
  })
})
