import { describe, it, expect } from 'vitest'
import { getSteps, INITIAL_DATA, type WizardData } from './_types'

function make(overrides: Partial<WizardData>): WizardData {
  return { ...INITIAL_DATA, ...overrides }
}

// ---------------------------------------------------------------------------
// Estado inicial — sin responder nada
// ---------------------------------------------------------------------------
describe('getSteps — estado inicial', () => {
  it('solo health-goal si no hay healthGoal', () => {
    expect(getSteps(INITIAL_DATA)).toEqual(['health-goal'])
  })

  it('health-goal + has-sport si healthGoal está pero hasSport es null', () => {
    expect(getSteps(make({ healthGoal: 'FITNESS' }))).toEqual(['health-goal', 'has-sport'])
    expect(getSteps(make({ healthGoal: 'WEIGHT_LOSS' }))).toEqual(['health-goal', 'has-sport'])
    expect(getSteps(make({ healthGoal: 'RECOMPOSITION' }))).toEqual(['health-goal', 'has-sport'])
  })
})

// ---------------------------------------------------------------------------
// Flujo con deporte (hasSport = true)
// ---------------------------------------------------------------------------
describe('getSteps — flujo SPORT (hasSport = true)', () => {
  it('agrega sport-select si aún no hay deporte elegido', () => {
    const steps = getSteps(make({ healthGoal: 'FITNESS', hasSport: true }))
    expect(steps).toEqual(['health-goal', 'has-sport', 'sport-select'])
  })

  it('flujo completo con RUNNING incluye todos los pasos', () => {
    const steps = getSteps(make({ healthGoal: 'FITNESS', hasSport: true, sport: 'RUNNING' }))
    expect(steps).toContain('sport-details')
    expect(steps).toContain('physical')
    expect(steps).toContain('hr-fitness')
    expect(steps).toContain('schedule')
    expect(steps).toContain('health')
    expect(steps).toContain('plan-method')
    expect(steps[steps.length - 1]).toBe('generating')
  })

  it.each(['RUNNING', 'STRENGTH'] as const)(
    'flujo completo con %s termina en generating',
    (sport) => {
      const steps = getSteps(make({ healthGoal: 'FITNESS', hasSport: true, sport }))
      expect(steps[steps.length - 1]).toBe('generating')
      expect(steps).toContain('sport-details')
    }
  )

  it('sport-details viene antes que physical', () => {
    const steps = getSteps(make({ healthGoal: 'FITNESS', hasSport: true, sport: 'RUNNING' }))
    expect(steps.indexOf('sport-details')).toBeLessThan(steps.indexOf('physical'))
  })

  it('no incluye body-goal ni gym-goal en flujo SPORT', () => {
    const steps = getSteps(make({ healthGoal: 'FITNESS', hasSport: true, sport: 'RUNNING' }))
    expect(steps).not.toContain('body-goal')
    expect(steps).not.toContain('gym-goal')
  })
})

// ---------------------------------------------------------------------------
// Flujo sin deporte (hasSport = false)
// ---------------------------------------------------------------------------
describe('getSteps — flujo sin deporte (hasSport = false)', () => {
  it('MUSCLE_GAIN — flujo GYM simplificado (sin hr-fitness ni schedule)', () => {
    const steps = getSteps(make({ healthGoal: 'MUSCLE_GAIN', hasSport: false }))
    expect(steps).not.toContain('sport-select')
    expect(steps).not.toContain('sport-details')
    expect(steps).not.toContain('hr-fitness')
    expect(steps).not.toContain('schedule')
    expect(steps).toContain('physical')
    expect(steps).toContain('plan-method')
    expect(steps[steps.length - 1]).toBe('generating')
  })

  it('WEIGHT_LOSS — flujo corporal completo con hr-fitness y schedule', () => {
    const steps = getSteps(make({ healthGoal: 'WEIGHT_LOSS', hasSport: false }))
    expect(steps).not.toContain('sport-select')
    expect(steps).not.toContain('sport-details')
    expect(steps).toContain('physical')
    expect(steps).toContain('hr-fitness')
    expect(steps).toContain('schedule')
    expect(steps[steps.length - 1]).toBe('generating')
  })

  it('RECOMPOSITION — flujo corporal completo', () => {
    const steps = getSteps(make({ healthGoal: 'RECOMPOSITION', hasSport: false }))
    expect(steps).toContain('hr-fitness')
    expect(steps[steps.length - 1]).toBe('generating')
  })

  it('FITNESS sin deporte — flujo corporal completo', () => {
    const steps = getSteps(make({ healthGoal: 'FITNESS', hasSport: false }))
    expect(steps).toContain('hr-fitness')
    expect(steps[steps.length - 1]).toBe('generating')
  })
})

// ---------------------------------------------------------------------------
// Invariantes del flujo
// ---------------------------------------------------------------------------
describe('getSteps — invariantes', () => {
  it('generating siempre es el último paso', () => {
    const cases = [
      make({ healthGoal: 'FITNESS', hasSport: true, sport: 'RUNNING' }),
      make({ healthGoal: 'FITNESS', hasSport: true, sport: 'STRENGTH' }),
      make({ healthGoal: 'WEIGHT_LOSS', hasSport: false }),
      make({ healthGoal: 'MUSCLE_GAIN', hasSport: false }),
      make({ healthGoal: 'RECOMPOSITION', hasSport: false }),
    ]
    cases.forEach(data => {
      const steps = getSteps(data)
      expect(steps[steps.length - 1]).toBe('generating')
    })
  })

  it('plan-method siempre está justo antes de generating', () => {
    const cases = [
      make({ healthGoal: 'FITNESS', hasSport: true, sport: 'RUNNING' }),
      make({ healthGoal: 'WEIGHT_LOSS', hasSport: false }),
      make({ healthGoal: 'MUSCLE_GAIN', hasSport: false }),
    ]
    cases.forEach(data => {
      const steps = getSteps(data)
      const genIdx = steps.indexOf('generating')
      expect(steps[genIdx - 1]).toBe('plan-method')
    })
  })

  it('health-goal siempre es el primer paso', () => {
    const cases = [
      INITIAL_DATA,
      make({ healthGoal: 'FITNESS' }),
      make({ healthGoal: 'FITNESS', hasSport: true, sport: 'RUNNING' }),
    ]
    cases.forEach(data => {
      expect(getSteps(data)[0]).toBe('health-goal')
    })
  })

  it('no incluye day-schedule (step huérfano no usado)', () => {
    const cases = [
      make({ healthGoal: 'FITNESS', hasSport: true, sport: 'RUNNING' }),
      make({ healthGoal: 'WEIGHT_LOSS', hasSport: false }),
      make({ healthGoal: 'MUSCLE_GAIN', hasSport: false }),
    ]
    cases.forEach(data => {
      expect(getSteps(data)).not.toContain('day-schedule')
    })
  })
})
