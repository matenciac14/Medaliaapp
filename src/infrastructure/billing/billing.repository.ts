/**
 * Implementación Prisma de IBillingRepository.
 * Único lugar donde billing toca la DB.
 */
import { prisma } from '@/lib/db/prisma'
import type { IBillingRepository, UpgradeCoachData, UpgradeAthleteData } from '@/domain/ports/billing.repository'
import type { SubscriptionSnapshot } from '@/domain/billing/billing.types'
import type { CoachTier } from '@/domain/subscription/tier_features'

export class BillingRepository implements IBillingRepository {

  async findByUserId(userId: string): Promise<SubscriptionSnapshot | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscription: {
          select: { tier: true, coachTier: true, currentPeriodEnd: true },
        },
      },
    })
    if (!user) return null
    const sub = user.subscription
    return {
      userId,
      userRole: user.role === 'COACH' ? 'COACH' : 'ATHLETE',
      tier: (sub?.tier ?? 'FREE') as SubscriptionSnapshot['tier'],
      coachTier: (sub?.coachTier ?? 'STARTER') as CoachTier,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    }
  }

  async upgradeCoach(userId: string, data: UpgradeCoachData, gateway?: string): Promise<void> {
    await prisma.userSubscription.upsert({
      where:  { userId },
      create: { userId, coachTier: data.coachTier as any, currentPeriodEnd: data.currentPeriodEnd, gateway: gateway ?? null },
      update: { coachTier: data.coachTier as any, currentPeriodEnd: data.currentPeriodEnd, ...(gateway ? { gateway } : {}) },
    })
  }

  async upgradeAthlete(userId: string, data: UpgradeAthleteData, gateway?: string): Promise<void> {
    await prisma.$transaction([
      prisma.userSubscription.upsert({
        where:  { userId },
        create: { userId, tier: 'PRO', currentPeriodEnd: data.currentPeriodEnd, gateway: gateway ?? null },
        update: { tier: 'PRO', currentPeriodEnd: data.currentPeriodEnd, ...(gateway ? { gateway } : {}) },
      }),
      // Activa las features de pago: plan adaptativo, check-in y progreso
      prisma.user.update({
        where: { id: userId },
        data: { featurePlan: true, featureCheckin: true, featureProgress: true },
      }),
    ])
  }

  async downgradeCoach(userId: string): Promise<void> {
    await prisma.userSubscription.update({
      where: { userId },
      data:  { coachTier: 'STARTER', currentPeriodEnd: null },
    })
    // Los atletas activos existentes no se pausa aquí.
    // El cron / lógica de UI notifica al coach que supera el límite del nuevo tier.
  }

  async downgradeAthlete(userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.userSubscription.update({
        where: { userId },
        data:  { tier: 'FREE', currentPeriodEnd: null },
      }),
      // Desactiva las features de pago (gates B2C Pro)
      prisma.user.update({
        where: { id: userId },
        data: { featurePlan: false, featureCheckin: false, featureProgress: false },
      }),
    ])
  }

  async findExpired(graceDays: number, now: Date): Promise<SubscriptionSnapshot[]> {
    // graceCutoff: solo vencidas lo suficiente para que la gracia haya terminado
    const graceCutoff = new Date(now)
    graceCutoff.setDate(graceCutoff.getDate() - graceDays)

    const subs = await prisma.userSubscription.findMany({
      where: {
        currentPeriodEnd: { not: null, lt: graceCutoff },
        OR: [
          { tier: 'PRO' },
          { coachTier: { not: 'STARTER' } },
        ],
      },
      include: { user: { select: { role: true } } },
    })

    return subs.map((s) => ({
      userId: s.userId,
      userRole: (s.user.role === 'COACH' ? 'COACH' : 'ATHLETE') as SubscriptionSnapshot['userRole'],
      tier: s.tier as SubscriptionSnapshot['tier'],
      coachTier: s.coachTier as CoachTier,
      currentPeriodEnd: s.currentPeriodEnd!,
    }))
  }

  async saveWebhookEventId(userId: string, eventId: string): Promise<void> {
    // updateMany en lugar de update para no lanzar P2025 si no existe registro
    await prisma.userSubscription.updateMany({
      where: { userId },
      data:  { lastWebhookEventId: eventId },
    })
  }

  async getLastWebhookEventId(userId: string): Promise<string | null> {
    const sub = await prisma.userSubscription.findUnique({
      where:  { userId },
      select: { lastWebhookEventId: true },
    })
    return sub?.lastWebhookEventId ?? null
  }

  async saveGateway(userId: string, gateway: string): Promise<void> {
    await prisma.userSubscription.update({
      where: { userId },
      data:  { gateway },
    })
  }
}
