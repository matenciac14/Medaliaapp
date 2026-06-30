import { describe, it, expect } from 'vitest'
import {
  isAthleteStuckInPending,
  isCoachWithoutAthletes,
  hoursSinceCreation,
  daysSinceCreation,
  buildAthleteAlert,
  buildCoachAlert,
  PENDING_ATHLETE_THRESHOLD_HOURS,
  COACH_WITHOUT_ATHLETES_THRESHOLD_DAYS,
} from './alerts'

// ---------------------------------------------------------------------------
// Helpers — todos relativos al mismo NOW fijo para evitar drift
// ---------------------------------------------------------------------------
const NOW = new Date()

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000)
}

function daysAgo(d: number): Date {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000)
}

function user(overrides: Partial<{ id: string; name: string | null; email: string; createdAt: Date }> = {}) {
  return {
    id: 'usr-1',
    name: 'Test',
    email: 'test@example.com',
    createdAt: daysAgo(1),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// isAthleteStuckInPending
// ---------------------------------------------------------------------------
describe('isAthleteStuckInPending', () => {
  it('atleta de hace 47h → NO alerta', () => {
    expect(isAthleteStuckInPending(hoursAgo(47), NOW)).toBe(false)
  })

  it(`atleta en el límite exacto (${PENDING_ATHLETE_THRESHOLD_HOURS}h) → alerta`, () => {
    expect(isAthleteStuckInPending(hoursAgo(PENDING_ATHLETE_THRESHOLD_HOURS), NOW)).toBe(true)
  })

  it('atleta de hace 72h → alerta', () => {
    expect(isAthleteStuckInPending(hoursAgo(72), NOW)).toBe(true)
  })

  it('atleta recién registrado → NO alerta', () => {
    expect(isAthleteStuckInPending(hoursAgo(1), NOW)).toBe(false)
  })

  it('respeta threshold personalizado', () => {
    expect(isAthleteStuckInPending(hoursAgo(10), NOW, 10)).toBe(true)
    expect(isAthleteStuckInPending(hoursAgo(9), NOW, 10)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isCoachWithoutAthletes
// ---------------------------------------------------------------------------
describe('isCoachWithoutAthletes', () => {
  it('coach con atletas → NO alerta independientemente del tiempo', () => {
    expect(isCoachWithoutAthletes(daysAgo(30), 1, NOW)).toBe(false)
    expect(isCoachWithoutAthletes(daysAgo(30), 5, NOW)).toBe(false)
  })

  it(`coach sin atletas, registrado hace 6 días → NO alerta (bajo el umbral)`, () => {
    expect(isCoachWithoutAthletes(daysAgo(6), 0, NOW)).toBe(false)
  })

  it(`coach sin atletas, registrado hace ${COACH_WITHOUT_ATHLETES_THRESHOLD_DAYS} días → alerta`, () => {
    expect(isCoachWithoutAthletes(daysAgo(COACH_WITHOUT_ATHLETES_THRESHOLD_DAYS), 0, NOW)).toBe(true)
  })

  it('coach sin atletas, registrado hace 30 días → alerta', () => {
    expect(isCoachWithoutAthletes(daysAgo(30), 0, NOW)).toBe(true)
  })

  it('respeta threshold personalizado', () => {
    expect(isCoachWithoutAthletes(daysAgo(3), 0, NOW, 3)).toBe(true)
    expect(isCoachWithoutAthletes(daysAgo(2), 0, NOW, 3)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// hoursSinceCreation / daysSinceCreation
// ---------------------------------------------------------------------------
describe('hoursSinceCreation', () => {
  it('calcula horas correctamente', () => {
    expect(hoursSinceCreation(hoursAgo(24), NOW)).toBe(24)
    expect(hoursSinceCreation(hoursAgo(0), NOW)).toBe(0)
  })
})

describe('daysSinceCreation', () => {
  it('calcula días correctamente', () => {
    expect(daysSinceCreation(daysAgo(7), NOW)).toBe(7)
    expect(daysSinceCreation(daysAgo(0), NOW)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// buildAthleteAlert
// ---------------------------------------------------------------------------
describe('buildAthleteAlert', () => {
  it('atleta reciente → null (sin alerta)', () => {
    const result = buildAthleteAlert(user({ createdAt: hoursAgo(10) }), NOW)
    expect(result).toBeNull()
  })

  it('atleta de hace 50h → alerta severity medium', () => {
    const result = buildAthleteAlert(user({ createdAt: hoursAgo(50) }), NOW)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('athlete_pending')
    expect(result!.severity).toBe('medium')
    expect(result!.hoursWaiting).toBe(50)
  })

  it('atleta de hace 100h → alerta severity high', () => {
    const result = buildAthleteAlert(user({ createdAt: hoursAgo(100) }), NOW)
    expect(result).not.toBeNull()
    expect(result!.severity).toBe('high')
  })

  it('incluye datos del usuario en la alerta', () => {
    const u = user({ id: 'usr-99', name: 'Juan', email: 'juan@example.com', createdAt: hoursAgo(60) })
    const result = buildAthleteAlert(u, NOW)
    expect(result!.userId).toBe('usr-99')
    expect(result!.name).toBe('Juan')
    expect(result!.email).toBe('juan@example.com')
  })
})

// ---------------------------------------------------------------------------
// buildCoachAlert
// ---------------------------------------------------------------------------
describe('buildCoachAlert', () => {
  it('coach con atletas → null (sin alerta)', () => {
    const result = buildCoachAlert(user({ createdAt: daysAgo(30) }), 3, NOW)
    expect(result).toBeNull()
  })

  it('coach recién registrado sin atletas → null', () => {
    const result = buildCoachAlert(user({ createdAt: daysAgo(3) }), 0, NOW)
    expect(result).toBeNull()
  })

  it('coach de hace 10 días sin atletas → alerta severity medium', () => {
    const result = buildCoachAlert(user({ createdAt: daysAgo(10) }), 0, NOW)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('coach_no_athletes')
    expect(result!.severity).toBe('medium')
    expect(result!.daysWithoutAthletes).toBe(10)
  })

  it('coach de hace 20 días sin atletas → alerta severity high', () => {
    const result = buildCoachAlert(user({ createdAt: daysAgo(20) }), 0, NOW)
    expect(result).not.toBeNull()
    expect(result!.severity).toBe('high')
  })

  it('incluye datos del usuario en la alerta', () => {
    const u = user({ id: 'cch-1', name: 'Pedro', email: 'pedro@example.com', createdAt: daysAgo(8) })
    const result = buildCoachAlert(u, 0, NOW)
    expect(result!.userId).toBe('cch-1')
    expect(result!.name).toBe('Pedro')
  })
})
