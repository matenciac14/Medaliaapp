import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: athleteId } = await params

  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId: session.user.id, athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!relation) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Obtener el plan activo con las últimas 4 semanas y sus sesiones
  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: athleteId, status: { in: ['ACTIVE', 'COMPLETED'] } },
    orderBy: { startDate: 'desc' },
    include: {
      weeks: {
        orderBy: { weekNumber: 'desc' },
        take: 4,
        include: {
          sessions: {
            select: {
              id: true,
              type: true,
              date: true,
              log: { select: { id: true } },
            },
          },
        },
      },
    },
  })

  if (!plan || plan.weeks.length === 0) {
    return NextResponse.json({ weeks: [] })
  }

  const weeks = plan.weeks
    .slice()
    .reverse() // cronológico ascendente
    .map((w) => {
      const planned = w.sessions.length
      const completed = w.sessions.filter((s) => s.log !== null).length
      const pct = planned > 0 ? Math.round((completed / planned) * 100) : null

      const startDate = w.sessions.length > 0
        ? w.sessions.reduce((min, s) => s.date < min ? s.date : min, w.sessions[0].date)
        : new Date()

      const weekLabel = startDate.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        timeZone: 'America/Bogota',
      })

      return {
        weekStart: startDate.toISOString().split('T')[0],
        weekLabel,
        planned,
        completed,
        pct,
      }
    })

  return NextResponse.json({ weeks })
}
