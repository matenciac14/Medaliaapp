import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isGracePeriodExpired, runBillingCheck } from './downgrade.use-case'
import { BILLING_GRACE_DAYS } from './billing.types'
import type { IBillingRepository } from '../ports/billing.repository.port'
import type { SubscriptionSnapshot } from './billing.types'

// ── isGracePeriodExpired ──────────────────────────────────────────────────────

describe('isGracePeriodExpired', () => {
  const periodEnd = new Date('2026-07-01T00:00:00.000Z')

  it('dentro del período de gracia → false', () => {
    const now = new Date('2026-07-03T00:00:00.000Z') // +2 días (gracia=3)
    expect(isGracePeriodExpired(periodEnd, now)).toBe(false)
  })

  it('al límite exacto de gracia → false (no incluye el último día)', () => {
    const now = new Date('2026-07-04T00:00:00.000Z') // +3 días exactos
    expect(isGracePeriodExpired(periodEnd, now)).toBe(false)
  })

  it('un segundo pasada la gracia → true', () => {
    const now = new Date('2026-07-04T00:00:01.000Z')
    expect(isGracePeriodExpired(periodEnd, now)).toBe(true)
  })

  it('mucho después del período → true', () => {
    const now = new Date('2026-09-01T00:00:00.000Z')
    expect(isGracePeriodExpired(periodEnd, now)).toBe(true)
  })

  it('respeta graceDays personalizado', () => {
    const now = new Date('2026-07-08T00:00:00.000Z') // +7 días
    expect(isGracePeriodExpired(periodEnd, now, 7)).toBe(false)
    expect(isGracePeriodExpired(periodEnd, now, 6)).toBe(true)
  })

  it('BILLING_GRACE_DAYS es 3', () => {
    expect(BILLING_GRACE_DAYS).toBe(3)
  })
})

// ── runBillingCheck ───────────────────────────────────────────────────────────

function makeRepo(expired: SubscriptionSnapshot[]): IBillingRepository {
  return {
    findByUserId: vi.fn(),
    upgradeCoach: vi.fn(),
    upgradeAthlete: vi.fn(),
    downgradeCoach: vi.fn().mockResolvedValue(undefined),
    downgradeAthlete: vi.fn().mockResolvedValue(undefined),
    findExpired: vi.fn().mockResolvedValue(expired),
  }
}

describe('runBillingCheck', () => {
  const now = new Date('2026-07-10T00:00:00.000Z')

  beforeEach(() => vi.clearAllMocks())

  it('no hace nada si no hay suscripciones expiradas', async () => {
    const repo = makeRepo([])
    const result = await runBillingCheck(repo, now)

    expect(result.downgradedCount).toBe(0)
    expect(repo.downgradeCoach).not.toHaveBeenCalled()
    expect(repo.downgradeAthlete).not.toHaveBeenCalled()
  })

  it('degrada un coach correctamente', async () => {
    const sub: SubscriptionSnapshot = {
      userId: 'coach1',
      userRole: 'COACH',
      tier: 'PRO',
      coachTier: 'GROWTH',
      currentPeriodEnd: new Date('2026-07-01'),
    }
    const repo = makeRepo([sub])
    const result = await runBillingCheck(repo, now)

    expect(result.downgradedCount).toBe(1)
    expect(repo.downgradeCoach).toHaveBeenCalledOnce()
    expect(repo.downgradeCoach).toHaveBeenCalledWith('coach1')
    expect(repo.downgradeAthlete).not.toHaveBeenCalled()
  })

  it('degrada un atleta correctamente', async () => {
    const sub: SubscriptionSnapshot = {
      userId: 'ath1',
      userRole: 'ATHLETE',
      tier: 'PRO',
      coachTier: 'STARTER',
      currentPeriodEnd: new Date('2026-07-01'),
    }
    const repo = makeRepo([sub])
    const result = await runBillingCheck(repo, now)

    expect(result.downgradedCount).toBe(1)
    expect(repo.downgradeAthlete).toHaveBeenCalledOnce()
    expect(repo.downgradeAthlete).toHaveBeenCalledWith('ath1')
    expect(repo.downgradeCoach).not.toHaveBeenCalled()
  })

  it('degrada múltiples suscripciones en una sola pasada', async () => {
    const subs: SubscriptionSnapshot[] = [
      { userId: 'c1', userRole: 'COACH',   tier: 'PRO', coachTier: 'PRO',   currentPeriodEnd: new Date('2026-07-01') },
      { userId: 'a1', userRole: 'ATHLETE', tier: 'PRO', coachTier: 'STARTER', currentPeriodEnd: new Date('2026-07-01') },
      { userId: 'c2', userRole: 'COACH',   tier: 'PRO', coachTier: 'SCALE', currentPeriodEnd: new Date('2026-07-01') },
      { userId: 'a2', userRole: 'ATHLETE', tier: 'PRO', coachTier: 'STARTER', currentPeriodEnd: new Date('2026-07-01') },
    ]
    const repo = makeRepo(subs)
    const result = await runBillingCheck(repo, now)

    expect(result.downgradedCount).toBe(4)
    expect(repo.downgradeCoach).toHaveBeenCalledTimes(2)
    expect(repo.downgradeAthlete).toHaveBeenCalledTimes(2)
  })

  it('pasa BILLING_GRACE_DAYS a findExpired', async () => {
    const repo = makeRepo([])
    await runBillingCheck(repo, now)
    expect(repo.findExpired).toHaveBeenCalledWith(BILLING_GRACE_DAYS, now)
  })
})
