import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { ATHLETE_PRO_PRICE_COP, ATHLETE_PRO_PRICE_USD } from '@/domain/billing/billing.types'
import AthletePlanClient from './_components/AthletePlanClient'

export const metadata = { title: 'Mi Plan — MedalIQ' }

export default async function AthletePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'ATHLETE') redirect('/coach/dashboard')

  const params = await searchParams
  const billingStatus = params.billing ?? null

  const [sub, b2bRelation] = await Promise.all([
    prisma.userSubscription.findUnique({
      where: { userId: session.user.id },
      select: { tier: true, currentPeriodEnd: true },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId: session.user.id, status: 'ACTIVE' },
      select: { coach: { select: { name: true } } },
    }),
  ])

  const tier = (sub?.tier === 'PRO' ? 'PRO' : 'FREE') as 'FREE' | 'PRO'
  const currentPeriodEnd = sub?.currentPeriodEnd?.toISOString() ?? null
  const coachName = b2bRelation?.coach.name ?? null

  return (
    <AthletePlanClient
      tier={tier}
      currentPeriodEnd={currentPeriodEnd}
      coachName={coachName}
      priceCOP={ATHLETE_PRO_PRICE_COP}
      priceUSD={ATHLETE_PRO_PRICE_USD}
      billingStatus={billingStatus}
    />
  )
}
