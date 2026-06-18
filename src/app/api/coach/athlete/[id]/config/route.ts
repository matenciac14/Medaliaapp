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

  const { features } = (await req.json()) as { features: Record<string, boolean> }

  // Solo el coach puede modificar estos features — el resto es responsabilidad del admin/billing
  const COACH_ALLOWED_FEATURES = ['plan', 'checkin', 'nutrition', 'progress', 'log', 'gym']
  const safeFeatures = Object.fromEntries(
    Object.entries(features).filter(([k]) => COACH_ALLOWED_FEATURES.includes(k))
  )

  const athlete = await prisma.user.findUnique({ where: { id: athleteId }, select: { config: true } })
  const config = parseUserConfig(athlete?.config)
  const updated = { ...config, features: { ...config.features, ...safeFeatures } }

  await prisma.user.update({ where: { id: athleteId }, data: { config: updated } })

  return Response.json({ ok: true })
}
