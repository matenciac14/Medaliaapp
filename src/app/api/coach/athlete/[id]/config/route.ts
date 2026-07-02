import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { PrismaUserRepository } from '@/infrastructure/db/user.repository'
import type { FeatureKey } from '@/domain/ports/user.repository'
import { sendPushNotification } from '@/lib/push'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: athleteId } = await params

  // Verificar que el coach tiene relación con este atleta
  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
  })
  if (!relation) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 })

  const body = (await req.json()) as { features?: Record<string, boolean>; coachGoal?: string | null; privateNotes?: string | null }

  await prisma.$transaction(async (tx) => {
    // Update features on User if provided — atomic merge, no read needed
    if (body.features) {
      const COACH_ALLOWED_FEATURES: FeatureKey[] = ['plan', 'checkin', 'nutrition', 'progress', 'log', 'gym']
      const safePatch = Object.fromEntries(
        Object.entries(body.features).filter(([k]) => COACH_ALLOWED_FEATURES.includes(k as FeatureKey))
      ) as Partial<Record<FeatureKey, boolean>>
      await new PrismaUserRepository(tx).mergeFeatures(athleteId, safePatch)
    }

    // Update coachGoal / privateNotes on CoachAthlete if provided
    if ('coachGoal' in body || 'privateNotes' in body) {
      const data: { coachGoal?: string | null; privateNotes?: string | null } = {}
      if ('coachGoal' in body) data.coachGoal = body.coachGoal ?? null
      if ('privateNotes' in body) data.privateNotes = body.privateNotes ?? null
      await tx.coachAthlete.update({
        where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
        data,
      })
    }
  })

  // Si se activaron features, notificar al atleta en tiempo real (fire-and-forget)
  if (body.features) {
    prisma.user.findUnique({ where: { id: athleteId }, select: { pushToken: true } })
      .then((athlete) => {
        if (athlete?.pushToken) {
          return sendPushNotification(
            athlete.pushToken,
            'Tu entrenador activó nuevas funciones',
            'Abre la app para acceder a tu plan de entrenamiento.',
            { type: 'features_updated' }
          )
        }
      })
      .catch(() => {})
  }

  return Response.json({ ok: true })
}
