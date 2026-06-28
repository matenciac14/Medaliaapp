import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'

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

  const ops: Promise<unknown>[] = []

  // Update features on User.config if provided
  if (body.features) {
    const COACH_ALLOWED_FEATURES = ['plan', 'checkin', 'nutrition', 'progress', 'log', 'gym']
    const safeFeatures = Object.fromEntries(
      Object.entries(body.features).filter(([k]) => COACH_ALLOWED_FEATURES.includes(k))
    )
    const athlete = await prisma.user.findUnique({ where: { id: athleteId }, select: { config: true } })
    const config = parseUserConfig(athlete?.config)
    const updated = { ...config, features: { ...config.features, ...safeFeatures } }
    ops.push(prisma.user.update({ where: { id: athleteId }, data: { config: updated } }))
  }

  // Update coachGoal / privateNotes on CoachAthlete if provided
  if ('coachGoal' in body || 'privateNotes' in body) {
    const data: { coachGoal?: string | null; privateNotes?: string | null } = {}
    if ('coachGoal' in body) data.coachGoal = body.coachGoal ?? null
    if ('privateNotes' in body) data.privateNotes = body.privateNotes ?? null
    ops.push(prisma.coachAthlete.update({
      where: { coachId_athleteId: { coachId: session.user.id, athleteId } },
      data,
    }))
  }

  await Promise.all(ops)

  return Response.json({ ok: true })
}
