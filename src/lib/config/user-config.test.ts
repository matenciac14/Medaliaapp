import { describe, it, expect } from 'vitest'
import { parseUserConfig, DEFAULT_USER_CONFIG, type UserPlan } from './user-config'

// ---------------------------------------------------------------------------
// DEFAULT_USER_CONFIG — estado inicial correcto
// ---------------------------------------------------------------------------
describe('DEFAULT_USER_CONFIG', () => {
  it('trial.plan es INACTIVE por defecto', () => {
    expect(DEFAULT_USER_CONFIG.trial.plan).toBe('INACTIVE')
  })

  it('todas las features están en false por defecto', () => {
    const f = DEFAULT_USER_CONFIG.features
    expect(f.plan).toBe(false)
    expect(f.checkin).toBe(false)
    expect(f.nutrition).toBe(false)
    expect(f.progress).toBe(false)
    expect(f.log).toBe(false)
    expect(f.gym).toBe(false)
    expect(f.aiCoach).toBe(false)
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
    const result = parseUserConfig({ features: { plan: true } })
    expect(result.features.plan).toBe(true)
    expect(result.features.checkin).toBe(false) // default preservado
    expect(result.features.gym).toBe(false)     // default preservado
    expect(result.features.aiCoach).toBe(false)
  })

  it('merge parcial de trial', () => {
    const result = parseUserConfig({ trial: { plan: 'PRO', endsAt: '2026-12-31' } })
    expect(result.trial.plan).toBe('PRO')
    expect(result.trial.endsAt).toBe('2026-12-31')
  })

  it('merge parcial de ai — monthlyLimit override', () => {
    const result = parseUserConfig({ ai: { monthlyLimit: 999999, messagesThisMonth: 5, messagesResetAt: '2026-06' } })
    expect(result.ai.monthlyLimit).toBe(999999)
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
// UserPlan — solo acepta TRIAL | PRO | INACTIVE (no FREE)
// ---------------------------------------------------------------------------
describe('UserPlan — valores válidos', () => {
  it('acepta TRIAL, PRO e INACTIVE', () => {
    const planes: UserPlan[] = ['TRIAL', 'PRO', 'INACTIVE']
    planes.forEach(plan => {
      const result = parseUserConfig({ trial: { plan, endsAt: null } })
      expect(result.trial.plan).toBe(plan)
    })
  })

  it('TRIAL — atleta en periodo de prueba', () => {
    const result = parseUserConfig({ trial: { plan: 'TRIAL', endsAt: '2026-07-01' } })
    expect(result.trial.plan).toBe('TRIAL')
    expect(result.trial.endsAt).toBe('2026-07-01')
  })

  it('PRO — atleta con pago activo', () => {
    const result = parseUserConfig({ trial: { plan: 'PRO', endsAt: null } })
    expect(result.trial.plan).toBe('PRO')
  })

  it('INACTIVE — trial expirado sin pago', () => {
    const result = parseUserConfig({ trial: { plan: 'INACTIVE', endsAt: null } })
    expect(result.trial.plan).toBe('INACTIVE')
  })
})
