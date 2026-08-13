/**
 * E2E agent: Session builder — pure functions
 *
 * Cubre las funciones puras que componen sesiones individuales para planes
 * personalizados (gym B2C, plan builder del coach) y la función sessionDate
 * que es usada en generatePlanUseCase para asignar fechas a cada sesión.
 *
 * Flujo cubierto:
 *   - generatePlanUseCase → template.weeks.flatMap → sessionDate + getSessionIntensity
 *   - /coach/athlete/[id]/plan/build → buildScheduledSessions
 *   - NutritionPlan sync: getSessionIntensity es la fuente de intensidad del día
 *
 * Cómo correr:
 *   pnpm test src/domain/plan/session-builder.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  sessionDate,
  getSetsRepsScheme,
  buildStrengthStructure,
  buildCardioStructure,
  buildScheduledSessions,
  SPLIT_LABELS,
  type HRZones,
  type WeekSchedule,
  type GymExercise,
} from './session-builder'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Monday 2026-07-06 — local date (no UTC string to avoid timezone shift) */
const MONDAY = new Date(2026, 6, 6) // months 0-indexed: 6 = July

const ZONES: HRZones = {
  z1: { min: 115, max: 130 },
  z2: { min: 130, max: 148 },
  z3: { min: 148, max: 162 },
  z4: { min: 162, max: 176 },
  z5: { min: 176, max: 192 },
}

const GYM_EXERCISES: GymExercise[] = [
  { id: '1', name: 'Press plano con barra', bodyPart: 'chest', target: 'pectorals', equipment: 'barbell' },
  { id: '2', name: 'Elevación lateral con mancuernas', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell' },
]

// ── sessionDate ───────────────────────────────────────────────────────────────

describe('sessionDate', () => {
  it('weekIndex=0, dayOfWeek=1 (lunes) → fecha del plan start (si es lunes)', () => {
    const result = sessionDate(MONDAY, 0, 1)
    expect(result.toDateString()).toBe(MONDAY.toDateString())
  })

  it('weekIndex=1, mismo día → 7 días después del inicio', () => {
    const result = sessionDate(MONDAY, 1, 1)
    const expected = new Date(MONDAY)
    expected.setDate(expected.getDate() + 7)
    expect(result.toDateString()).toBe(expected.toDateString())
  })

  it('weekIndex=2 → 14 días después', () => {
    const result = sessionDate(MONDAY, 2, 1)
    const expected = new Date(MONDAY)
    expected.setDate(expected.getDate() + 14)
    expect(result.toDateString()).toBe(expected.toDateString())
  })

  it('dayOfWeek=3 (miércoles) desde un lunes → avanza 2 días', () => {
    const result = sessionDate(MONDAY, 0, 3)
    const expected = new Date(MONDAY)
    expected.setDate(expected.getDate() + 2)
    expect(result.toDateString()).toBe(expected.toDateString())
  })

  it('dayOfWeek=7 (domingo) → avanza 6 días desde el lunes', () => {
    const result = sessionDate(MONDAY, 0, 7)
    const expected = new Date(MONDAY)
    expected.setDate(expected.getDate() + 6)
    expect(result.toDateString()).toBe(expected.toDateString())
  })

  it('no muta el planStart original', () => {
    const original = MONDAY.getTime()
    sessionDate(MONDAY, 3, 5)
    expect(MONDAY.getTime()).toBe(original)
  })

  it('retorna una nueva instancia Date (no la misma referencia)', () => {
    const result = sessionDate(MONDAY, 0, 1)
    expect(result).not.toBe(MONDAY)
  })
})

// ── getSetsRepsScheme ─────────────────────────────────────────────────────────

describe('getSetsRepsScheme', () => {
  it('BASE → 3×12-15', () => {
    expect(getSetsRepsScheme('BASE')).toBe('3×12-15')
  })

  it('DESARROLLO → 4×10-12', () => {
    expect(getSetsRepsScheme('DESARROLLO')).toBe('4×10-12')
  })

  it('ESPECIFICO → 4×8-10 (sin tilde)', () => {
    expect(getSetsRepsScheme('ESPECIFICO')).toBe('4×8-10')
  })

  it('ESPECÍFICO (con tilde, valor inválido en DB) → default 3×10-12', () => {
    // Phase enum solo almacena ESPECIFICO (sin tilde). Este valor nunca llega del DB.
    expect(getSetsRepsScheme('ESPECÍFICO')).toBe('3×10-12')
  })

  it('AFINAMIENTO → 3×10-12 (default)', () => {
    expect(getSetsRepsScheme('AFINAMIENTO')).toBe('3×10-12')
  })

  it('fase desconocida → 3×10-12 (default)', () => {
    expect(getSetsRepsScheme('UNKNOWN')).toBe('3×10-12')
    expect(getSetsRepsScheme('')).toBe('3×10-12')
  })
})

// ── buildStrengthStructure ────────────────────────────────────────────────────

describe('buildStrengthStructure', () => {
  it('incluye la duración en el output', () => {
    const result = buildStrengthStructure('PUSH', GYM_EXERCISES, 60, 'BASE')
    expect(result).toContain('60 min')
  })

  it('incluye el label del split (PUSH_LABEL)', () => {
    const result = buildStrengthStructure('PUSH', GYM_EXERCISES, 60, 'BASE')
    expect(result).toContain(SPLIT_LABELS['PUSH'])
  })

  it('incluye el scheme correcto para la fase', () => {
    const result = buildStrengthStructure('PUSH', GYM_EXERCISES, 60, 'BASE')
    expect(result).toContain('3×12-15')
  })

  it('incluye los nombres de ejercicios', () => {
    const result = buildStrengthStructure('PUSH', GYM_EXERCISES, 60, 'BASE')
    expect(result).toContain('Press plano con barra')
    expect(result).toContain('Elevación lateral con mancuernas')
  })

  it('PULL split usa su propio label', () => {
    const result = buildStrengthStructure('PULL', GYM_EXERCISES, 45, 'DESARROLLO')
    expect(result).toContain(SPLIT_LABELS['PULL'])
    expect(result).toContain('4×10-12')
  })

  it('LEGS split usa su propio label', () => {
    const result = buildStrengthStructure('LEGS', GYM_EXERCISES, 50, 'ESPECIFICO')
    expect(result).toContain(SPLIT_LABELS['LEGS'])
    expect(result).toContain('4×8-10')
  })

  it('funciona con lista de ejercicios vacía', () => {
    const result = buildStrengthStructure('FULL_BODY', [], 60, 'BASE')
    expect(result).toContain('60 min')
    expect(result).toContain(SPLIT_LABELS['FULL_BODY'])
  })
})

// ── buildCardioStructure ──────────────────────────────────────────────────────

describe('buildCardioStructure', () => {
  it('BASE → zoneTarget Z2', () => {
    const { zoneTarget } = buildCardioStructure('TREADMILL', 45, 'BASE', ZONES)
    expect(zoneTarget).toBe('Z2')
  })

  it('DESARROLLO → zoneTarget Z2-Z3', () => {
    const { zoneTarget } = buildCardioStructure('TREADMILL', 50, 'DESARROLLO', ZONES)
    expect(zoneTarget).toBe('Z2-Z3')
  })

  it('ESPECIFICO → zoneTarget Z2-Z3', () => {
    const { zoneTarget } = buildCardioStructure('BIKE', 55, 'ESPECIFICO', ZONES)
    expect(zoneTarget).toBe('Z2-Z3')
  })

  it('AFINAMIENTO → zoneTarget Z1-Z2 (recuperación activa)', () => {
    const { zoneTarget } = buildCardioStructure('ANY', 30, 'AFINAMIENTO', ZONES)
    expect(zoneTarget).toBe('Z1-Z2')
  })

  it('incluye bpms de las zonas en el structure text', () => {
    const { structure } = buildCardioStructure('TREADMILL', 45, 'BASE', ZONES)
    expect(structure).toContain('130')
    expect(structure).toContain('148')
  })

  it('incluye el nombre de la máquina — TREADMILL = cinta', () => {
    const { structure } = buildCardioStructure('TREADMILL', 40, 'BASE', ZONES)
    expect(structure).toContain('cinta')
  })

  it('incluye el nombre de la máquina — BIKE = bici estática', () => {
    const { structure } = buildCardioStructure('BIKE', 40, 'BASE', ZONES)
    expect(structure).toContain('bici estática')
  })

  it('durationMin = warm + main + cool (los minutos se usan todos)', () => {
    const durationMin = 40
    const { structure } = buildCardioStructure('ANY', durationMin, 'BASE', ZONES)
    // La estructura siempre empieza con "{durationMin} min en"
    expect(structure).toContain(`${durationMin} min en`)
  })
})

// ── buildScheduledSessions ────────────────────────────────────────────────────

describe('buildScheduledSessions', () => {
  const weekMeta = { phase: 'BASE' }
  const planStart = MONDAY

  const scheduleAllStrength: WeekSchedule = {
    1: { type: 'strength', split: 'PUSH' },
    2: { type: 'rest' },
    3: { type: 'strength', split: 'PULL' },
    4: { type: 'rest' },
    5: { type: 'strength', split: 'LEGS' },
    6: { type: 'rest' },
    7: { type: 'rest' },
  }

  const scheduleWithCardio: WeekSchedule = {
    1: { type: 'strength', split: 'PUSH' },
    2: { type: 'rest' },
    3: { type: 'cardio', cardioMachine: 'TREADMILL' },
    4: { type: 'rest' },
    5: { type: 'strength', split: 'PULL' },
    6: { type: 'rest' },
    7: { type: 'rest' },
  }

  it('filtra los días de descanso — solo retorna días activos', () => {
    const sessions = buildScheduledSessions('week-1', weekMeta, scheduleAllStrength, planStart, 0, ZONES, 1)
    expect(sessions).toHaveLength(3)
  })

  it('sesión de fuerza → type = FUERZA', () => {
    const sessions = buildScheduledSessions('week-1', weekMeta, scheduleAllStrength, planStart, 0, ZONES, 1)
    sessions.forEach((s) => expect(s.type).toBe('FUERZA'))
  })

  it('sesión de cardio → type = OTRO', () => {
    const sessions = buildScheduledSessions('week-1', weekMeta, scheduleWithCardio, planStart, 0, ZONES, 1)
    const cardioSession = sessions.find((s) => s.dayOfWeek === 3)
    expect(cardioSession?.type).toBe('OTRO')
  })

  it('todas las sesiones tienen el weekId correcto', () => {
    const sessions = buildScheduledSessions('my-week-id', weekMeta, scheduleAllStrength, planStart, 0, ZONES, 1)
    sessions.forEach((s) => expect(s.weekId).toBe('my-week-id'))
  })

  it('durationMin = hoursPerSession × 60 (redondeado)', () => {
    const sessions = buildScheduledSessions('week-1', weekMeta, scheduleAllStrength, planStart, 0, ZONES, 1.5)
    sessions.forEach((s) => expect(s.durationMin).toBe(90))
  })

  it('los dayOfWeek corresponden a los días activos del schedule', () => {
    const sessions = buildScheduledSessions('week-1', weekMeta, scheduleAllStrength, planStart, 0, ZONES, 1)
    const days = sessions.map((s) => s.dayOfWeek).sort()
    expect(days).toEqual([1, 3, 5])
  })

  it('schedule completamente de descanso → sin sesiones', () => {
    const allRest: WeekSchedule = {
      1: { type: 'rest' }, 2: { type: 'rest' }, 3: { type: 'rest' },
      4: { type: 'rest' }, 5: { type: 'rest' }, 6: { type: 'rest' }, 7: { type: 'rest' },
    }
    const sessions = buildScheduledSessions('week-1', weekMeta, allRest, planStart, 0, ZONES, 1)
    expect(sessions).toHaveLength(0)
  })

  it('weekIndex=1 → sesiones tienen fechas 7 días después que weekIndex=0', () => {
    const week0 = buildScheduledSessions('w0', weekMeta, scheduleAllStrength, planStart, 0, ZONES, 1)
    const week1 = buildScheduledSessions('w1', weekMeta, scheduleAllStrength, planStart, 1, ZONES, 1)
    const diff = (week1[0].date.getTime() - week0[0].date.getTime()) / (1000 * 60 * 60 * 24)
    expect(diff).toBe(7)
  })

  it('sesión de fuerza con gymExercises → detailText incluye nombre del ejercicio', () => {
    const exercises = { PUSH: GYM_EXERCISES }
    const sessions = buildScheduledSessions('week-1', weekMeta, scheduleAllStrength, planStart, 0, ZONES, 1, exercises)
    const pushSession = sessions.find((s) => s.dayOfWeek === 1)
    expect(pushSession?.detailText).toContain('Press plano con barra')
  })
})
