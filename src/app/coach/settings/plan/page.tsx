import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import {
  COACH_TIER_PRICES_USD,
  usdToCopDisplay,
} from '@/domain/billing/billing.types'
import { getTrmWithMeta } from '@/infrastructure/billing/trm'
import { getCoachLimits } from '@/domain/subscription/tier-features'
import type { CoachTier } from '@/domain/subscription/tier-features'
import CoachPlanClient from './_components/CoachPlanClient'

export const metadata = { title: 'Mi Plan — MedalIQ' }

const TIER_NAMES: Record<CoachTier, string> = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  PRO: 'Pro',
  SCALE: 'Scale',
}

const TIER_ORDER: CoachTier[] = ['STARTER', 'GROWTH', 'PRO', 'SCALE']

export default async function CoachPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'COACH') redirect('/dashboard')

  const params = await searchParams
  const billingStatus = params.billing ?? null

  const [sub, athleteCount, trmMeta] = await Promise.all([
    prisma.userSubscription.findUnique({
      where: { userId: session.user.id },
      select: { coachTier: true, currentPeriodEnd: true, gateway: true },
    }),
    prisma.coachAthlete.count({
      where: {
        coachId: session.user.id,
        status: 'ACTIVE',
        athlete: { onboardingCompleted: true },
      },
    }),
    getTrmWithMeta(),
  ])

  const currentTier = (sub?.coachTier ?? 'STARTER') as CoachTier
  const { maxAthletes } = getCoachLimits(currentTier)
  const currentPeriodEnd = sub?.currentPeriodEnd?.toISOString() ?? null
  const gateway = sub?.gateway ?? null

  const currentIdx = TIER_ORDER.indexOf(currentTier)
  const currentPriceCOP = usdToCopDisplay(COACH_TIER_PRICES_USD[currentTier], trmMeta.value)
  const currentPriceUSD = COACH_TIER_PRICES_USD[currentTier]
  const upgradeTiers = TIER_ORDER.filter((t) => TIER_ORDER.indexOf(t) > currentIdx).map((tier) => ({
    tier,
    name: TIER_NAMES[tier],
    priceCOP: usdToCopDisplay(COACH_TIER_PRICES_USD[tier], trmMeta.value),
    priceUSD: COACH_TIER_PRICES_USD[tier],
    maxAthletes: getCoachLimits(tier).maxAthletes,
  }))

  return (
    <CoachPlanClient
      currentTier={currentTier}
      currentTierName={TIER_NAMES[currentTier]}
      currentPriceCOP={currentPriceCOP}
      currentPriceUSD={currentPriceUSD}
      athleteCount={athleteCount}
      maxAthletes={maxAthletes}
      currentPeriodEnd={currentPeriodEnd}
      gateway={gateway}
      upgradeTiers={upgradeTiers}
      trmDate={trmMeta.date}
      billingStatus={billingStatus}
    />
  )
}
