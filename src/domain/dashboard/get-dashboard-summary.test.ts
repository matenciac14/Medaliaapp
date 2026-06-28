import { describe, it, expect } from 'vitest'
import { getDashboardSummary, type DashboardInput, type PlanWeek } from './get-dashboard-summary.use-case'

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function baseInput(overrides: Partial<DashboardInput> = {}): DashboardInput {
  return {
    user: { name: 'Ana López', profile: null },
    activePlanRaw: null,
    lastCompletedPlan: null,
    checkIns: [],
    recentLogs: [],
    nutritionPlan: null,
    assignedWorkout: null,
    ...overrides,
  }
}

function makePlan(startDaysAgo: number, totalWeeks = 8) {
  const start = daysAgo(startDaysAgo)
  return {
    id: 'plan-1',
    name: 'Test Plan',
    startDate: start,
    totalWeeks,
    weeks: [] as PlanWeek[],
  }
}

// ── mode ─────────────────────────────────────────────────────────────────────

describe('mode', () => {
  it('FREE cuando no hay plan ni historial de plan', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.mode).toBe('FREE')
  })

  it('TRAINING cuando hay plan activo', () => {
    const { summary } = getDashboardSummary(baseInput({ activePlanRaw: makePlan(7) }))
    expect(summary.mode).toBe('TRAINING')
  })

  it('RECOVERY cuando el plan terminó hace menos de 14 días', () => {
    const endedDaysAgo = 5
    const totalWeeks = 8
    // plan que "terminó" hace 5 días: startDate = 8*7 + 5 días atrás
    const startDaysAgo = totalWeeks * 7 + endedDaysAgo
    const { summary } = getDashboardSummary(baseInput({
      lastCompletedPlan: { name: 'Plan terminado', endDate: daysAgo(endedDaysAgo) },
    }))
    expect(summary.mode).toBe('RECOVERY')
    expect(summary.recoveryDaysLeft).toBe(14 - endedDaysAgo)
  })

  it('FREE cuando el plan terminó hace más de 14 días', () => {
    const { summary } = getDashboardSummary(baseInput({
      lastCompletedPlan: { name: 'Plan antiguo', endDate: daysAgo(20) },
    }))
    expect(summary.mode).toBe('FREE')
    expect(summary.recoveryDaysLeft).toBe(0)
  })

  it('planIdToComplete cuando el plan activo ya venció por fecha', () => {
    // plan de 4 semanas que empezó 30 días atrás → ya debería estar completado
    const { summary, planIdToComplete } = getDashboardSummary(baseInput({
      activePlanRaw: makePlan(30, 4),
    }))
    expect(planIdToComplete).toBe('plan-1')
    expect(summary.mode).toBe('RECOVERY')
  })
})

// ── recentActivity ────────────────────────────────────────────────────────────

describe('recentActivity', () => {
  it('vacío cuando no hay logs', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.recentActivity).toEqual([])
  })

  it('usa freeSessionType para logs libres', () => {
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [
        { completedAt: new Date(), freeSessionType: 'RODAJE_Z2', durationMin: 45, rpe: 6, plannedSession: null },
        { completedAt: new Date(), freeSessionType: 'FUERZA',    durationMin: 60, rpe: 7, plannedSession: null },
      ],
    }))
    expect(summary.recentActivity).toHaveLength(2)
    expect(summary.recentActivity[0].type).toBe('RODAJE_Z2')
    expect(summary.recentActivity[0].durationMin).toBe(45)
    expect(summary.recentActivity[0].rpe).toBe(6)
    expect(summary.recentActivity[1].type).toBe('FUERZA')
  })

  it('fallback a plannedSession.type cuando no hay freeSessionType', () => {
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [
        { completedAt: new Date(), freeSessionType: null, durationMin: 30, rpe: 5, plannedSession: { type: 'TEMPO' } },
      ],
    }))
    expect(summary.recentActivity[0].type).toBe('TEMPO')
  })

  it('fallback a OTRO cuando no hay ningún tipo', () => {
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [
        { completedAt: new Date(), freeSessionType: null, durationMin: null, rpe: null, plannedSession: null },
      ],
    }))
    expect(summary.recentActivity[0].type).toBe('OTRO')
  })

  it('limita a 5 actividades aunque haya más logs', () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({
      completedAt: new Date(),
      freeSessionType: 'FUERZA',
      durationMin: 60,
      rpe: i + 1,
      plannedSession: null,
    }))
    const { summary } = getDashboardSummary(baseInput({ recentLogs: logs }))
    expect(summary.recentActivity).toHaveLength(5)
  })

  it('completedAt se serializa como string ISO', () => {
    const now = new Date()
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [{ completedAt: now, freeSessionType: 'OTRO', durationMin: null, rpe: null, plannedSession: null }],
    }))
    expect(summary.recentActivity[0].completedAt).toBe(now.toISOString())
  })
})

// ── firstName ─────────────────────────────────────────────────────────────────

describe('firstName', () => {
  it('extrae primer nombre', () => {
    const { summary } = getDashboardSummary(baseInput({ user: { name: 'María José García', profile: null } }))
    expect(summary.firstName).toBe('María')
  })

  it('fallback a Atleta cuando user es null', () => {
    const { summary } = getDashboardSummary(baseInput({ user: null }))
    expect(summary.firstName).toBe('Atleta')
  })
})
