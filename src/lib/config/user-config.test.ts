import { describe, it, expect, afterEach } from 'vitest'
import { parseUserConfig, DEFAULT_USER_CONFIG, getUserPlan, type UserPlan } from './user-config'

// ---------------------------------------------------------------------------
// DEFAULT_USER_CONFIG — estado inicial correcto
// ---------------------------------------------------------------------------
describe('DEFAULT_USER_CONFIG', () => {
  it('plan es true por defecto', () => {
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

  it('feature coach desactivada por defecto', () => {
    expect(DEFAULT_USER_CONFIG.features.coach).toBe(false)
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
    const result = parseUserConfig({ features: { coach: true } })
    expect(result.features.coach).toBe(true)
    expect(result.features.plan).toBe(true)
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

  it('campos stale del DB (aiPlan, aiCoach) NO pasan al resultado', () => {
    const raw = { features: { plan: true, checkin: true, nutrition: true, progress: true, log: true, coach: false, gym: true, aiPlan: false, aiCoach: false } }
    const result = parseUserConfig(raw)
    expect(result.features).not.toHaveProperty('aiPlan')
    expect(result.features).not.toHaveProperty('aiCoach')
    expect(result.features.plan).toBe(true)
    expect(result.features.coach).toBe(false)
  })

  it('campos stale no sobreescriben features reales', () => {
    const raw = { features: { plan: false, aiCoach: true } }
    const result = parseUserConfig(raw)
    expect(result.features.plan).toBe(false)
    expect(result.features).not.toHaveProperty('aiCoach')
  })
})

// ---------------------------------------------------------------------------
// getUserPlan — comportamiento según BILLING_ENABLED
// ---------------------------------------------------------------------------
describe('getUserPlan', () => {
  const orig = process.env.BILLING_ENABLED

  afterEach(() => {
    if (orig === undefined) delete process.env.BILLING_ENABLED
    else process.env.BILLING_ENABLED = orig
  })

  it('devuelve PRO cuando BILLING_ENABLED no está seteado (beta)', () => {
    delete process.env.BILLING_ENABLED
    expect(getUserPlan(DEFAULT_USER_CONFIG.features)).toBe('PRO')
  })

  it('devuelve PRO cuando BILLING_ENABLED=false', () => {
    process.env.BILLING_ENABLED = 'false'
    expect(getUserPlan(DEFAULT_USER_CONFIG.features, 'FREE')).toBe('PRO')
  })

  it('devuelve TRIAL cuando BILLING_ENABLED=true y tier=TRIAL', () => {
    process.env.BILLING_ENABLED = 'true'
    expect(getUserPlan(DEFAULT_USER_CONFIG.features, 'TRIAL')).toBe('TRIAL')
  })

  it('devuelve PRO cuando BILLING_ENABLED=true y tier=PRO', () => {
    process.env.BILLING_ENABLED = 'true'
    expect(getUserPlan(DEFAULT_USER_CONFIG.features, 'PRO')).toBe('PRO')
  })

  it('devuelve FREE cuando BILLING_ENABLED=true y tier=FREE', () => {
    process.env.BILLING_ENABLED = 'true'
    expect(getUserPlan(DEFAULT_USER_CONFIG.features, 'FREE')).toBe('FREE')
  })

  it('devuelve FREE cuando BILLING_ENABLED=true y sin tier', () => {
    process.env.BILLING_ENABLED = 'true'
    expect(getUserPlan(DEFAULT_USER_CONFIG.features, null)).toBe('FREE')
  })
})

// ---------------------------------------------------------------------------
// UserPlan — valores válidos
// ---------------------------------------------------------------------------
describe('UserPlan — valores válidos', () => {
  it('acepta FREE, PRO y TRIAL', () => {
    const planes: UserPlan[] = ['FREE', 'PRO', 'TRIAL']
    planes.forEach(plan => {
      expect(['FREE', 'PRO', 'TRIAL']).toContain(plan)
    })
  })
})
