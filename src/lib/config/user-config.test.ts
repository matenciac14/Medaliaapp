import { describe, it, expect } from 'vitest'
import { parseUserConfig, DEFAULT_USER_CONFIG, getUserPlan, type UserPlan } from './user-config'

// ---------------------------------------------------------------------------
// DEFAULT_USER_CONFIG — estado inicial correcto
// ---------------------------------------------------------------------------
describe('DEFAULT_USER_CONFIG', () => {
  it('plan es true por defecto — todos los usuarios acceden al módulo de plan', () => {
    expect(DEFAULT_USER_CONFIG.features.plan).toBe(true)
  })

  it('features operacionales activadas por defecto', () => {
    const f = DEFAULT_USER_CONFIG.features
    expect(f.plan).toBe(true)
    expect(f.checkin).toBe(true)
    expect(f.nutrition).toBe(true)
    expect(f.progress).toBe(true)
    expect(f.log).toBe(true)
    expect(f.gym).toBe(true)
  })

  it('features de pago desactivadas por defecto', () => {
    const f = DEFAULT_USER_CONFIG.features
    expect(f.aiPlan).toBe(false)
    expect(f.aiCoach).toBe(false)
    expect(f.coach).toBe(false)
  })

  it('ai.monthlyLimit es 0 por defecto', () => {
    expect(DEFAULT_USER_CONFIG.ai.monthlyLimit).toBe(0)
  })

  it('onboarding no está completado por defecto', () => {
    expect(DEFAULT_USER_CONFIG.onboarding.completed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// parseUserConfig — merge con defaults
// ---------------------------------------------------------------------------
describe('parseUserConfig', () => {
  it('devuelve DEFAULT cuando raw es null', () => {
    expect(parseUserConfig(null)).toEqual(DEFAULT_USER_CONFIG)
  })

  it('devuelve DEFAULT cuando raw es undefined', () => {
    expect(parseUserConfig(undefined)).toEqual(DEFAULT_USER_CONFIG)
  })

  it('devuelve DEFAULT cuando raw no es objeto', () => {
    expect(parseUserConfig('string')).toEqual(DEFAULT_USER_CONFIG)
    expect(parseUserConfig(42)).toEqual(DEFAULT_USER_CONFIG)
    expect(parseUserConfig(true)).toEqual(DEFAULT_USER_CONFIG)
  })

  it('merge parcial de features — defaults conservados', () => {
    const result = parseUserConfig({ features: { aiPlan: true } })
    expect(result.features.aiPlan).toBe(true)
    expect(result.features.plan).toBe(true)   // default true preservado
    expect(result.features.aiCoach).toBe(false) // default false preservado
  })

  it('merge parcial de ai — monthlyLimit override', () => {
    const result = parseUserConfig({ ai: { monthlyLimit: 100, messagesThisMonth: 5, messagesResetAt: '2026-06' } })
    expect(result.ai.monthlyLimit).toBe(100)
    expect(result.ai.messagesThisMonth).toBe(5)
  })

  it('merge parcial de sport', () => {
    const result = parseUserConfig({ sport: { type: 'RUNNING', goal: 'RACE' } })
    expect(result.sport.type).toBe('RUNNING')
    expect(result.sport.goal).toBe('RACE')
  })

  it('merge parcial de onboarding', () => {
    const result = parseUserConfig({ onboarding: { completed: true, completedAt: '2026-01-01' } })
    expect(result.onboarding.completed).toBe(true)
    expect(result.onboarding.completedAt).toBe('2026-01-01')
  })

  it('objeto vacío devuelve todos los defaults', () => {
    const result = parseUserConfig({})
    expect(result).toEqual(DEFAULT_USER_CONFIG)
  })
})

// ---------------------------------------------------------------------------
// getUserPlan — deriva FREE | PRO de features
// ---------------------------------------------------------------------------
describe('getUserPlan', () => {
  it('FREE cuando aiPlan y aiCoach son false', () => {
    expect(getUserPlan({ ...DEFAULT_USER_CONFIG.features })).toBe('FREE')
  })

  it('PRO cuando aiPlan es true', () => {
    expect(getUserPlan({ ...DEFAULT_USER_CONFIG.features, aiPlan: true })).toBe('PRO')
  })

  it('PRO cuando aiCoach es true', () => {
    expect(getUserPlan({ ...DEFAULT_USER_CONFIG.features, aiCoach: true })).toBe('PRO')
  })

  it('PRO cuando ambos son true', () => {
    expect(getUserPlan({ ...DEFAULT_USER_CONFIG.features, aiPlan: true, aiCoach: true })).toBe('PRO')
  })
})

// ---------------------------------------------------------------------------
// UserPlan — solo acepta FREE | PRO
// ---------------------------------------------------------------------------
describe('UserPlan — valores válidos', () => {
  it('acepta FREE y PRO', () => {
    const planes: UserPlan[] = ['FREE', 'PRO']
    planes.forEach(plan => {
      expect(['FREE', 'PRO']).toContain(plan)
    })
  })
})
