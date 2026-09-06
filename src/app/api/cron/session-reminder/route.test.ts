import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    trainingPlan: { findMany: vi.fn() },
    plannedSession: { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/core/week_number', () => ({ getPlanWeekNumber: vi.fn() }))
vi.mock('@/infrastructure/email/resend', () => ({ sendSessionReminderEmail: vi.fn() }))
vi.mock('@/lib/push/expo_push', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }))

import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { sendSessionReminderEmail } from '@/infrastructure/email/resend'

const SECRET = 'test-secret'
process.env.CRON_SECRET = SECRET

function makeReq(auth = `Bearer ${SECRET}`) {
  return new NextRequest(new URL('/api/cron/session-reminder', 'http://localhost'), {
    headers: { authorization: auth },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/cron/session-reminder', () => {
  it('retorna 401 sin Authorization correcto', async () => {
    const res = await GET(makeReq('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('retorna { sent: 0, failed: 0 } si no hay planes activos', async () => {
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([])
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ sent: 0, failed: 0 })
    // No debe consultar plannedSession si no hay planes
    expect(prisma.plannedSession.findMany).not.toHaveBeenCalled()
  })

  it('envía email y cuenta sent=1 cuando hay una sesión de lunes', async () => {
    const plan = {
      id: 'plan-1',
      startDate: new Date('2026-01-06'),
      totalWeeks: 8,
      user: { email: 'atleta@test.com', name: 'Ana', pushToken: null },
    }
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([plan] as any)
    vi.mocked(getPlanWeekNumber).mockReturnValue(2)
    vi.mocked(prisma.plannedSession.findMany).mockResolvedValue([
      {
        type: 'RODAJE_Z2',
        durationMin: 45,
        detailText: 'Zona 2 suave',
        week: { planId: 'plan-1' },
      },
    ] as any)
    vi.mocked(sendSessionReminderEmail).mockResolvedValue(undefined as any)

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(body.failed).toBe(0)
    expect(sendSessionReminderEmail).toHaveBeenCalledWith(
      'atleta@test.com',
      'Ana',
      expect.objectContaining({ typeLabel: 'Rodaje Z2', durationMin: 45 })
    )
  })

  it('omite sesiones DESCANSO y no envía email', async () => {
    const plan = {
      id: 'plan-2',
      startDate: new Date('2026-01-06'),
      totalWeeks: 8,
      user: { email: 'a@b.com', name: 'Test', pushToken: null },
    }
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([plan] as any)
    vi.mocked(getPlanWeekNumber).mockReturnValue(1)
    vi.mocked(prisma.plannedSession.findMany).mockResolvedValue([
      { type: 'DESCANSO', durationMin: null, detailText: null, week: { planId: 'plan-2' } },
    ] as any)

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(sendSessionReminderEmail).not.toHaveBeenCalled()
  })

  it('solo carga las sesiones con OR de filtros planId+weekNumber (no all weeks)', async () => {
    const plan = {
      id: 'plan-3',
      startDate: new Date('2026-01-06'),
      totalWeeks: 12,
      user: { email: 'x@x.com', name: 'X', pushToken: null },
    }
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([plan] as any)
    vi.mocked(getPlanWeekNumber).mockReturnValue(5)
    vi.mocked(prisma.plannedSession.findMany).mockResolvedValue([])

    await GET(makeReq())

    expect(prisma.plannedSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dayOfWeek: 1,
          week: { OR: [{ planId: 'plan-3', weekNumber: 5 }] },
        }),
      })
    )
  })

  it('cuenta failed cuando sendSessionReminderEmail lanza excepción', async () => {
    const plan = {
      id: 'plan-4',
      startDate: new Date('2026-01-06'),
      totalWeeks: 8,
      user: { email: 'fail@test.com', name: 'Fail', pushToken: null },
    }
    vi.mocked(prisma.trainingPlan.findMany).mockResolvedValue([plan] as any)
    vi.mocked(getPlanWeekNumber).mockReturnValue(1)
    vi.mocked(prisma.plannedSession.findMany).mockResolvedValue([
      { type: 'TEMPO', durationMin: 60, detailText: null, week: { planId: 'plan-4' } },
    ] as any)
    vi.mocked(sendSessionReminderEmail).mockRejectedValue(new Error('smtp error'))

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(1)
  })
})
