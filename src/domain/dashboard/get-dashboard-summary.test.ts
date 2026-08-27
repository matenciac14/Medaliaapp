/**
 * E2E agent: getDashboardSummary — pantalla principal del atleta
 *
 * getDashboardSummary es la función central que alimenta /dashboard.
 * Recibe datos crudos de DB y produce el summary + señal de side effect.
 *
 * Campos cubiertos:
 *   mode, recentActivity, firstName, todaySession, weekSessions,
 *   completedCount, totalTraining, planData, nutritionTarget,
 *   formStatus, checkinPending, weeklyWeightChange, weightProgressPct,
 *   streakDays, metrics, isRecomp, raceDays
 *
 * Cómo correr:
 *   pnpm test src/domain/dashboard/get-dashboard-summary.test.ts
 */
import { describe, it, expect } from 'vitest'
import { getDashboardSummary, type DashboardInput, type PlanWeek } from './get-dashboard-summary.use-case'

// ── Helpers ──────────────────────────────────────────────────────────────────

// Hoy en nuestro esquema de dayOfWeek (1=Lun...7=Dom)
const jsDay = new Date().getDay()
const TODAY_DOW = jsDay === 0 ? 7 : jsDay

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

function makeSession(dayOfWeek: number, type: string, opts: {
  id?: string
  log?: { id: string } | null
  intensity?: string | null
  durationMin?: number | null
  zone?: string | null
  description?: string | null
} = {}) {
  return {
    id: opts.id ?? `session-${dayOfWeek}`,
    log: opts.log ?? null,
    type,
    dayOfWeek,
    durationMin: opts.durationMin ?? 45,
    zone: opts.zone ?? '2',
    intensity: opts.intensity ?? 'MODERATE',
    description: opts.description ?? 'Sesión de prueba',
    coachNotes: null,
  }
}

function makePlanWithSessions(
  sessions: ReturnType<typeof makeSession>[],
  startDaysAgo = 0,
  totalWeeks = 8,
  phase = 'BASE',
  volumeKm = 30
) {
  return {
    id: 'plan-1',
    name: 'Test Plan',
    startDate: daysAgo(startDaysAgo),
    totalWeeks,
    weeks: [
      { weekNumber: 1, phase, volumeKm, sessions },
    ] as PlanWeek[],
  }
}

const BASE_NUTRITION = {
  targetKcalHard: 2500,
  targetKcalEasy: 2200,
  targetKcalRest: 1900,
  proteinG: 140,
  carbsHardG: 300,
  carbsEasyG: 220,
  fatG: 70,
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

  it('incluye GymSession completadas en recentActivity', () => {
    const { summary } = getDashboardSummary(baseInput({
      recentGymSessions: [
        { date: daysAgo(1), durationMin: 55, templateName: 'Push' },
        { date: daysAgo(3), durationMin: 60, templateName: 'Pull' },
      ],
    }))
    expect(summary.recentActivity).toHaveLength(2)
    expect(summary.recentActivity[0].type).toBe('FUERZA')
    expect(summary.recentActivity[0].durationMin).toBe(55)
  })

  it('merge SessionLog + GymSession ordenados por fecha desc', () => {
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [
        { completedAt: daysAgo(2), freeSessionType: 'RODAJE_Z2', durationMin: 40, rpe: 5, plannedSession: null },
      ],
      recentGymSessions: [
        { date: daysAgo(1), durationMin: 55, templateName: 'Push' },
      ],
    }))
    expect(summary.recentActivity).toHaveLength(2)
    expect(summary.recentActivity[0].type).toBe('FUERZA')
    expect(summary.recentActivity[1].type).toBe('RODAJE_Z2')
  })

  it('limita a 5 incluyendo gym sessions', () => {
    const logs = Array.from({ length: 4 }, (_, i) => ({
      completedAt: daysAgo(i * 2), freeSessionType: 'RODAJE_Z2', durationMin: 30, rpe: 5, plannedSession: null,
    }))
    const gymSessions = Array.from({ length: 4 }, (_, i) => ({
      date: daysAgo(i * 2 + 1), durationMin: 60, templateName: null,
    }))
    const { summary } = getDashboardSummary(baseInput({ recentLogs: logs, recentGymSessions: gymSessions }))
    expect(summary.recentActivity).toHaveLength(5)
  })
})

// ── hasEverLogged ─────────────────────────────────────────────────────────────

describe('hasEverLogged', () => {
  it('false cuando no hay logs ni gym sessions', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.hasEverLogged).toBe(false)
  })

  it('true cuando hay SessionLog', () => {
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [{ completedAt: new Date(), freeSessionType: 'OTRO', durationMin: null, rpe: null, plannedSession: null }],
    }))
    expect(summary.hasEverLogged).toBe(true)
  })

  it('true cuando hay GymSession completadas (sin SessionLog)', () => {
    const { summary } = getDashboardSummary(baseInput({
      gymCompletionDates: [daysAgo(1)],
    }))
    expect(summary.hasEverLogged).toBe(true)
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

// ── todaySession ──────────────────────────────────────────────────────────────

describe('todaySession', () => {
  it('null cuando no hay plan activo', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.todaySession).toBeNull()
  })

  it('null cuando hay plan pero sin sesiones en la semana actual', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([]),
    }))
    expect(summary.todaySession).toBeNull()
  })

  it('null cuando la sesión de hoy es DESCANSO', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([makeSession(TODAY_DOW, 'DESCANSO')]),
    }))
    expect(summary.todaySession).toBeNull()
  })

  it('retorna sesión cuando hay sesión activa hoy', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([makeSession(TODAY_DOW, 'RODAJE_Z2', { durationMin: 45, zone: '2' })]),
    }))
    expect(summary.todaySession).not.toBeNull()
    expect(summary.todaySession?.type).toBe('RODAJE_Z2')
    expect(summary.todaySession?.durationMin).toBe(45)
    expect(summary.todaySession?.zoneTarget).toBe('2')
  })

  it('completed=true cuando la sesión tiene log', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([
        makeSession(TODAY_DOW, 'TEMPO', { log: { id: 'log-1' } }),
      ]),
    }))
    expect(summary.todaySession?.completed).toBe(true)
  })

  it('completed=false cuando la sesión no tiene log', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([makeSession(TODAY_DOW, 'FUERZA')]),
    }))
    expect(summary.todaySession?.completed).toBe(false)
  })

  it('todaySession desde gym assignedWorkout cuando no hay plan activo', () => {
    const { summary } = getDashboardSummary(baseInput({
      assignedWorkout: {
        template: {
          days: [{ dayOfWeek: TODAY_DOW, isRestDay: false }],
        },
      },
    }))
    expect(summary.todaySession).not.toBeNull()
    expect(summary.todaySession?.type).toBe('FUERZA')
    expect(summary.todaySession?.id).toBe('gym-today')
  })

  it('todaySession null desde gym cuando el día de hoy es descanso en el template', () => {
    const { summary } = getDashboardSummary(baseInput({
      assignedWorkout: {
        template: {
          days: [{ dayOfWeek: TODAY_DOW, isRestDay: true }],
        },
      },
    }))
    expect(summary.todaySession).toBeNull()
  })
})

// ── weekSessions + completedCount + totalTraining ────────────────────────────

describe('weekSessions', () => {
  it('7 slots siempre (uno por día de la semana)', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.weekSessions).toHaveLength(7)
  })

  it('slots vacíos cuando no hay plan ni gym', () => {
    const { summary } = getDashboardSummary(baseInput())
    summary.weekSessions.forEach((slot) => {
      expect(slot.type).toBeNull()
      expect(slot.done).toBe(false)
    })
  })

  it('slot en dayIndex=0 (lunes) cuando hay sesión con dayOfWeek=1', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([makeSession(1, 'RODAJE_Z2')]),
    }))
    expect(summary.weekSessions[0].type).toBe('RODAJE_Z2')
  })

  it('slot en dayIndex=6 (domingo) cuando hay sesión con dayOfWeek=7', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([makeSession(7, 'TIRADA_LARGA')]),
    }))
    expect(summary.weekSessions[6].type).toBe('TIRADA_LARGA')
  })

  it('done=true en el slot correcto cuando la sesión tiene log', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([
        makeSession(2, 'FUERZA', { log: { id: 'log-1' } }),
      ]),
    }))
    expect(summary.weekSessions[1].done).toBe(true)   // dayIndex 1 = martes
    expect(summary.weekSessions[0].done).toBe(false)  // lunes sin sesión
  })

  it('isToday=true en el slot del día actual', () => {
    const { summary } = getDashboardSummary(baseInput())
    const todaySlot = summary.weekSessions[TODAY_DOW - 1]
    expect(todaySlot.isToday).toBe(true)
    // Verificar que solo un slot es isToday
    const todaySlots = summary.weekSessions.filter(s => s.isToday)
    expect(todaySlots).toHaveLength(1)
  })
})

describe('completedCount y totalTraining', () => {
  it('0/0 cuando no hay plan', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.completedCount).toBe(0)
    expect(summary.totalTraining).toBe(0)
  })

  it('totalTraining = número de sesiones en la semana actual', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([
        makeSession(1, 'RODAJE_Z2'),
        makeSession(3, 'TEMPO'),
        makeSession(5, 'TIRADA_LARGA'),
      ]),
    }))
    expect(summary.totalTraining).toBe(3)
  })

  it('completedCount = sesiones con log en la semana actual', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([
        makeSession(1, 'RODAJE_Z2', { log: { id: 'log-1' } }),
        makeSession(3, 'TEMPO', { log: { id: 'log-2' } }),
        makeSession(5, 'TIRADA_LARGA'),                    // sin log
      ]),
    }))
    expect(summary.completedCount).toBe(2)
    expect(summary.totalTraining).toBe(3)
  })
})

// ── planData ──────────────────────────────────────────────────────────────────

describe('planData', () => {
  it('null cuando no hay plan activo', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.planData).toBeNull()
  })

  it('incluye name, currentWeek, totalWeeks, phase cuando hay plan activo', () => {
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([], 0, 12, 'DESARROLLO'),
    }))
    expect(summary.planData).not.toBeNull()
    expect(summary.planData?.name).toBe('Test Plan')
    expect(summary.planData?.currentWeek).toBe(1)
    expect(summary.planData?.totalWeeks).toBe(12)
    expect(summary.planData?.phase).toBe('DESARROLLO')
  })
})

// ── nutritionTarget ───────────────────────────────────────────────────────────

describe('nutritionTarget', () => {
  it('null cuando no hay nutritionPlan', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.nutritionTarget).toBeNull()
  })

  it('non-null cuando hay nutritionPlan', () => {
    const { summary } = getDashboardSummary(baseInput({
      nutritionPlan: BASE_NUTRITION,
    }))
    expect(summary.nutritionTarget).not.toBeNull()
    expect(summary.nutritionTarget?.kcal).toBeGreaterThan(0)
    expect(summary.nutritionTarget?.proteinG).toBeGreaterThan(0)
    expect(summary.nutritionTarget?.carbsG).toBeGreaterThan(0)
  })

  it('día de entrenamiento intenso usa targetKcalHard', () => {
    // Sesión TIRADA_LARGA → HIGH intensity → targetKcalHard
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([
        makeSession(TODAY_DOW, 'TIRADA_LARGA', { intensity: 'HIGH' }),
      ]),
      nutritionPlan: BASE_NUTRITION,
    }))
    expect(summary.nutritionTarget?.kcal).toBe(BASE_NUTRITION.targetKcalHard)
  })

  it('día de descanso usa targetKcalRest', () => {
    // Sin sesión hoy → intensity null → REST
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([makeSession(TODAY_DOW, 'DESCANSO')]),
      nutritionPlan: BASE_NUTRITION,
    }))
    expect(summary.nutritionTarget?.kcal).toBe(BASE_NUTRITION.targetKcalRest)
  })
})

// ── formStatus ────────────────────────────────────────────────────────────────

describe('formStatus', () => {
  it('good + "Listo para entrenar fuerte" cuando energía alta, RPE bajo, sueño ok', () => {
    const { summary } = getDashboardSummary(baseInput({
      checkIns: [{
        recordedAt: daysAgo(7),
        weekNumber: 1,
        weightKg: 70,
        hrResting: 55,
        sleepHours: 7.5,
        energyLevel: 5,
        hardestSessionRpe: 6,
      }],
    }))
    expect(summary.formStatus).toBe('good')
    expect(summary.formMessage).toContain('fuerte')
  })

  it('moderate + "Carga moderada" cuando energía media o RPE alto', () => {
    const { summary } = getDashboardSummary(baseInput({
      checkIns: [{
        recordedAt: daysAgo(7),
        weekNumber: 1,
        weightKg: 70,
        hrResting: 55,
        sleepHours: 7,
        energyLevel: 3,
        hardestSessionRpe: 7,
      }],
    }))
    expect(summary.formStatus).toBe('moderate')
  })

  it('rest + "Prioriza la recuperación" cuando energía baja o sueño insuficiente', () => {
    const { summary } = getDashboardSummary(baseInput({
      checkIns: [{
        recordedAt: daysAgo(7),
        weekNumber: 1,
        weightKg: 70,
        hrResting: 55,
        sleepHours: 5.5,  // < 6.5h
        energyLevel: 2,
        hardestSessionRpe: 9,
      }],
    }))
    expect(summary.formStatus).toBe('rest')
    expect(summary.formMessage).toContain('recuperación')
  })

  it('good + "Sin datos de check-in" cuando no hay checkIns', () => {
    const { summary } = getDashboardSummary(baseInput({ checkIns: [] }))
    expect(summary.formStatus).toBe('good')
    expect(summary.formMessage).toBe('Sin datos de check-in')
  })
})

// ── checkinPending ────────────────────────────────────────────────────────────

describe('checkinPending', () => {
  it('true cuando no hay check-ins registrados', () => {
    const { summary } = getDashboardSummary(baseInput({ checkIns: [] }))
    expect(summary.checkinPending).toBe(true)
  })

  it('false cuando el último check-in corresponde a la semana actual del plan', () => {
    // Plan iniciado hoy → currentWeek = 1
    // Check-in con weekNumber = 1 → no pendiente
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([], 0),
      checkIns: [{
        recordedAt: new Date(),
        weekNumber: 1,
        weightKg: 70,
        hrResting: 55,
        sleepHours: 7,
        energyLevel: 4,
        hardestSessionRpe: 6,
      }],
    }))
    expect(summary.checkinPending).toBe(false)
  })

  it('true cuando el último check-in es de una semana anterior', () => {
    // Plan iniciado hoy → currentWeek = 1
    // Check-in con weekNumber = 0 (semana anterior) → pendiente
    const { summary } = getDashboardSummary(baseInput({
      activePlanRaw: makePlanWithSessions([], 0),
      checkIns: [{
        recordedAt: daysAgo(10),
        weekNumber: 0,
        weightKg: 70,
        hrResting: 55,
        sleepHours: 7,
        energyLevel: 4,
        hardestSessionRpe: 6,
      }],
    }))
    expect(summary.checkinPending).toBe(true)
  })
})

// ── weeklyWeightChange ────────────────────────────────────────────────────────

describe('weeklyWeightChange', () => {
  it('null cuando hay menos de 2 check-ins con peso', () => {
    const { summary } = getDashboardSummary(baseInput({
      checkIns: [{
        recordedAt: new Date(), weekNumber: 1,
        weightKg: 70, hrResting: 55, sleepHours: 7, energyLevel: 4, hardestSessionRpe: 6,
      }],
    }))
    expect(summary.weeklyWeightChange).toBeNull()
  })

  it('calcula cambio semanal normalizado a 7 días', () => {
    // Pérdida de 0.5 kg en 7 días → weeklyWeightChange = -0.5
    const { summary } = getDashboardSummary(baseInput({
      checkIns: [
        {
          recordedAt: new Date(),
          weekNumber: 2,
          weightKg: 70.0,
          hrResting: 55, sleepHours: 7, energyLevel: 4, hardestSessionRpe: 6,
        },
        {
          recordedAt: daysAgo(7),
          weekNumber: 1,
          weightKg: 70.5,
          hrResting: 55, sleepHours: 7, energyLevel: 4, hardestSessionRpe: 6,
        },
      ],
    }))
    expect(summary.weeklyWeightChange).toBe(-0.5)
  })

  it('cambio positivo cuando el peso subió', () => {
    const { summary } = getDashboardSummary(baseInput({
      checkIns: [
        {
          recordedAt: new Date(),
          weekNumber: 2,
          weightKg: 71.0,
          hrResting: 55, sleepHours: 7, energyLevel: 4, hardestSessionRpe: 6,
        },
        {
          recordedAt: daysAgo(7),
          weekNumber: 1,
          weightKg: 70.0,
          hrResting: 55, sleepHours: 7, energyLevel: 4, hardestSessionRpe: 6,
        },
      ],
    }))
    expect(summary.weeklyWeightChange).toBe(1.0)
  })
})

// ── weightProgressPct ─────────────────────────────────────────────────────────

describe('weightProgressPct', () => {
  it('null cuando no hay targetWeight definido', () => {
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: 75, weightGoalKg: null, hrResting: null, sleepHoursAvg: null, sportDetails: null, sportGoal: null } },
    }))
    expect(summary.weightProgressPct).toBeNull()
  })

  it('0% cuando peso actual = peso inicial (sin progreso)', () => {
    // startWeight = checkIns.reverse()[0].weightKg = primer check-in = 80
    // currentWeight = último check-in = 80
    // targetWeight = 70
    // progress = (80-80)/(80-70) = 0%
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: 80, weightGoalKg: 70, hrResting: null, sleepHoursAvg: null, sportDetails: null, sportGoal: null } },
      checkIns: [
        {
          recordedAt: new Date(), weekNumber: 2,
          weightKg: 80, hrResting: null, sleepHours: null, energyLevel: null, hardestSessionRpe: null,
        },
      ],
    }))
    expect(summary.weightProgressPct).toBe(0)
  })

  it('100% cuando peso actual = peso objetivo (meta alcanzada)', () => {
    // startWeight = primer check-in = 80
    // currentWeight = último check-in = 70
    // targetWeight = 70
    // progress = (80-70)/(80-70) = 100%
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: 80, weightGoalKg: 70, hrResting: null, sleepHoursAvg: null, sportDetails: null, sportGoal: null } },
      checkIns: [
        {
          recordedAt: new Date(), weekNumber: 4,
          weightKg: 70, hrResting: null, sleepHours: null, energyLevel: null, hardestSessionRpe: null,
        },
        {
          recordedAt: daysAgo(21), weekNumber: 1,
          weightKg: 80, hrResting: null, sleepHours: null, energyLevel: null, hardestSessionRpe: null,
        },
      ],
    }))
    expect(summary.weightProgressPct).toBe(100)
  })
  it('funciona para meta de SUBIR de peso (79.8 → 83)', () => {
    // startWeight = primer check-in = 78
    // currentWeight = último check-in = 79.8
    // targetWeight = 83
    // totalDistance = |83-78| = 5, remaining = |83-79.8| = 3.2
    // pct = (5-3.2)/5 = 36%
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Seb', profile: { weightKg: 78, weightGoalKg: 83, hrResting: null, sleepHoursAvg: null, sportDetails: null, sportGoal: null } },
      checkIns: [
        {
          recordedAt: new Date(), weekNumber: 4,
          weightKg: 79.8, hrResting: null, sleepHours: null, energyLevel: null, hardestSessionRpe: null,
        },
        {
          recordedAt: daysAgo(21), weekNumber: 1,
          weightKg: 78, hrResting: null, sleepHours: null, energyLevel: null, hardestSessionRpe: null,
        },
      ],
    }))
    expect(summary.weightProgressPct).toBe(36)
  })
})

// ── streakDays ────────────────────────────────────────────────────────────────

describe('streakDays', () => {
  it('0 cuando no hay logs', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.streakDays).toBe(0)
  })

  it('1 cuando hay un log de hoy', () => {
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [{
        completedAt: new Date(),
        freeSessionType: 'RODAJE_Z2',
        durationMin: 45,
        rpe: 6,
        plannedSession: null,
      }],
    }))
    expect(summary.streakDays).toBe(1)
  })

  it('2 cuando hay logs de hoy y ayer consecutivos', () => {
    const today = new Date()
    const yesterday = daysAgo(1)
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [
        { completedAt: today, freeSessionType: 'FUERZA', durationMin: 60, rpe: 7, plannedSession: null },
        { completedAt: yesterday, freeSessionType: 'RODAJE_Z2', durationMin: 45, rpe: 6, plannedSession: null },
      ],
    }))
    expect(summary.streakDays).toBe(2)
  })

  it('0 cuando el último log fue hace 2+ días (racha rota)', () => {
    const { summary } = getDashboardSummary(baseInput({
      recentLogs: [{
        completedAt: daysAgo(2),
        freeSessionType: 'FUERZA',
        durationMin: 60,
        rpe: 7,
        plannedSession: null,
      }],
    }))
    expect(summary.streakDays).toBe(0)
  })
})

// ── metrics ───────────────────────────────────────────────────────────────────

describe('metrics', () => {
  it('usa profile.weightKg cuando no hay check-ins', () => {
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: 65, weightGoalKg: 60, hrResting: 58, sleepHoursAvg: 7.5, sportDetails: null, sportGoal: null } },
    }))
    expect(summary.metrics.weightKg).toBe(65)
    expect(summary.metrics.weightGoalKg).toBe(60)
    expect(summary.metrics.hrResting).toBe(58)
    expect(summary.metrics.sleepHours).toBe(7.5)
  })

  it('usa último check-in sobre profile cuando hay check-ins', () => {
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: 65, weightGoalKg: 60, hrResting: 58, sleepHoursAvg: 7.5, sportDetails: null, sportGoal: null } },
      checkIns: [{
        recordedAt: new Date(), weekNumber: 3,
        weightKg: 63.5, hrResting: 54, sleepHours: 8, energyLevel: 4, hardestSessionRpe: 6,
      }],
    }))
    expect(summary.metrics.weightKg).toBe(63.5)    // check-in gana sobre profile
    expect(summary.metrics.hrResting).toBe(54)      // check-in gana sobre profile
    expect(summary.metrics.sleepHours).toBe(8)      // check-in gana sobre profile
  })

  it('todos null cuando no hay profile ni check-ins', () => {
    const { summary } = getDashboardSummary(baseInput({ user: { name: 'Ana', profile: null } }))
    expect(summary.metrics.weightKg).toBeNull()
    expect(summary.metrics.weightGoalKg).toBeNull()
    expect(summary.metrics.hrResting).toBeNull()
    expect(summary.metrics.sleepHours).toBeNull()
  })
})

// ── isRecomp y raceDays ───────────────────────────────────────────────────────

describe('isRecomp', () => {
  it('true cuando sportGoal incluye BODY', () => {
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: null, weightGoalKg: null, hrResting: null, sleepHoursAvg: null, sportDetails: null, sportGoal: 'BODY_RECOMPOSITION' } },
    }))
    expect(summary.isRecomp).toBe(true)
  })

  it('false cuando sportGoal es RACE', () => {
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: null, weightGoalKg: null, hrResting: null, sleepHoursAvg: null, sportDetails: null, sportGoal: 'RACE' } },
    }))
    expect(summary.isRecomp).toBe(false)
  })

  it('false cuando no hay profile', () => {
    const { summary } = getDashboardSummary(baseInput())
    expect(summary.isRecomp).toBe(false)
  })
})

describe('raceDays', () => {
  it('null cuando sportDetails no tiene raceDate', () => {
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: null, weightGoalKg: null, hrResting: null, sleepHoursAvg: null, sportDetails: {}, sportGoal: 'RACE' } },
    }))
    expect(summary.raceDays).toBeNull()
  })

  it('positivo cuando la carrera es en el futuro', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: null, weightGoalKg: null, hrResting: null, sleepHoursAvg: null, sportDetails: { raceDate: futureDate.toISOString() }, sportGoal: 'RACE' } },
    }))
    expect(summary.raceDays).toBeGreaterThan(0)
    expect(summary.raceDays).toBeLessThanOrEqual(30)
  })

  it('negativo cuando la carrera ya pasó', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)
    const { summary } = getDashboardSummary(baseInput({
      user: { name: 'Ana', profile: { weightKg: null, weightGoalKg: null, hrResting: null, sleepHoursAvg: null, sportDetails: { raceDate: pastDate.toISOString() }, sportGoal: 'RACE' } },
    }))
    expect(summary.raceDays).toBeLessThan(0)
  })
})

// ── CONTRACT TEST — contrato público JSON con la mobile app ──────────────────
//
// Estos tests verifican los NOMBRES de campo del output, no solo los valores.
// Si alguien renombra un campo del output (ej: detailText → description),
// TypeScript NO lo detecta (sigue siendo string), pero este test SÍ falla.
//
// NUNCA renombrar estos campos sin versionar la API mobile primero.
// ─────────────────────────────────────────────────────────────────────────────
describe('CONTRACT — output field names (mobile API shape)', () => {
  it('todaySession tiene los campos exactos que espera la app mobile', () => {
    const plan = makePlanWithSessions([makeSession(TODAY_DOW, 'RODAJE_Z2', { zone: 'Z2', description: 'Rodaje suave' })])
    const { summary } = getDashboardSummary(baseInput({ activePlanRaw: plan }))

    expect(summary.todaySession).not.toBeNull()
    // Campos que la mobile app lee por nombre — NO renombrar
    expect(summary.todaySession).toHaveProperty('id')
    expect(summary.todaySession).toHaveProperty('logId')
    expect(summary.todaySession).toHaveProperty('type')
    expect(summary.todaySession).toHaveProperty('intensity')
    expect(summary.todaySession).toHaveProperty('durationMin')
    expect(summary.todaySession).toHaveProperty('zoneTarget')   // ← nombre en JSON, origen: zone
    expect(summary.todaySession).toHaveProperty('detailText')   // ← nombre en JSON, origen: description
    expect(summary.todaySession).toHaveProperty('completed')
  })

  it('weekSessions[i] tiene los campos exactos que espera la app mobile', () => {
    const plan = makePlanWithSessions([makeSession(1, 'RODAJE_Z2')])
    const { summary } = getDashboardSummary(baseInput({ activePlanRaw: plan }))

    const slot = summary.weekSessions[0]
    expect(slot).toHaveProperty('dayIndex')
    expect(slot).toHaveProperty('type')
    expect(slot).toHaveProperty('done')
    expect(slot).toHaveProperty('isToday')
    expect(slot).toHaveProperty('id')
    expect(slot).toHaveProperty('durationMin')
    expect(slot).toHaveProperty('zoneTarget')   // ← nombre en JSON, origen: zone
  })

  it('planData tiene los campos exactos que espera la app mobile', () => {
    const plan = makePlanWithSessions([makeSession(1, 'RODAJE_Z2')])
    const { summary } = getDashboardSummary(baseInput({ activePlanRaw: plan }))

    expect(summary.planData).not.toBeNull()
    expect(summary.planData).toHaveProperty('name')
    expect(summary.planData).toHaveProperty('currentWeek')
    expect(summary.planData).toHaveProperty('totalWeeks')
    expect(summary.planData).toHaveProperty('phase')
  })

  it('todaySession.zoneTarget viene del campo zone del SessionLog', () => {
    const plan = makePlanWithSessions([makeSession(TODAY_DOW, 'RODAJE_Z2', { zone: 'Z3-Z4' })])
    const { summary } = getDashboardSummary(baseInput({ activePlanRaw: plan }))

    expect(summary.todaySession?.zoneTarget).toBe('Z3-Z4')
  })

  it('todaySession.detailText viene del campo description del SessionLog', () => {
    const plan = makePlanWithSessions([makeSession(TODAY_DOW, 'TEMPO', { description: 'Calentamiento 15min + 3×10min Tempo' })])
    const { summary } = getDashboardSummary(baseInput({ activePlanRaw: plan }))

    expect(summary.todaySession?.detailText).toBe('Calentamiento 15min + 3×10min Tempo')
  })
})
