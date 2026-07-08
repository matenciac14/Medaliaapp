import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

/** Lunes de la semana que contiene `date` (semana ISO: Lunes=inicio). */
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay() // 0=Dom
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Domingo (fin de semana) a partir del lunes. */
function getSundayOf(monday: Date): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Etiqueta legible: "Lun 1 Jul" */
function weekLabel(monday: Date): string {
  return monday.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

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
    where: { coachId: session.user.id, athleteId },
    select: { id: true },
  })
  if (!relation) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  // Calcular lunes de las últimas 4 semanas (incluyendo la actual)
  const thisMonday = getMondayOf(new Date())
  const mondays = [0, 1, 2, 3].map((i) => {
    const d = new Date(thisMonday)
    d.setDate(d.getDate() - i * 7)
    return d
  }).reverse() // cronológico ascendente

  const rangeStart = mondays[0]
  const rangeEnd = getSundayOf(mondays[3])

  // Fetch paralelo: AssignedWorkout activo + plan activo + sesiones completadas en el rango
  const [assignedWorkout, activePlan, completedSessions] = await Promise.all([
    prisma.assignedWorkout.findFirst({
      where: { athleteId, isActive: true },
      select: {
        template: {
          select: {
            days: { select: { isRestDay: true } },
          },
        },
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      select: { id: true, startDate: true },
    }),
    prisma.gymSession.findMany({
      where: { athleteId, completed: true, date: { gte: rangeStart, lte: rangeEnd } },
      select: { date: true },
    }),
  ])

  // Días de entrenamiento por semana según la rutina asignada
  const trainingDaysPerWeek = assignedWorkout
    ? assignedWorkout.template.days.filter((d) => !d.isRestDay).length
    : null

  // Si hay plan activo y no hay AssignedWorkout, buscar FUERZA sessions del plan por semana
  let plannedFuerzaByWeek: Map<string, number> | null = null
  if (!assignedWorkout && activePlan) {
    const fuerzaSessions = await prisma.plannedSession.findMany({
      where: {
        week: { planId: activePlan.id },
        type: 'FUERZA',
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: { date: true },
    })
    plannedFuerzaByWeek = new Map()
    for (const s of fuerzaSessions) {
      if (!s.date) continue
      const key = getMondayOf(s.date).toISOString()
      plannedFuerzaByWeek.set(key, (plannedFuerzaByWeek.get(key) ?? 0) + 1)
    }
  }

  // Agrupar sesiones completadas por semana
  const completedByWeek = new Map<string, number>()
  for (const s of completedSessions) {
    const key = getMondayOf(s.date).toISOString()
    completedByWeek.set(key, (completedByWeek.get(key) ?? 0) + 1)
  }

  const weeks = mondays.map((monday) => {
    const key = monday.toISOString()
    const completed = completedByWeek.get(key) ?? 0
    const planned = trainingDaysPerWeek
      ?? plannedFuerzaByWeek?.get(key)
      ?? null

    const pct = planned && planned > 0 ? Math.round((completed / planned) * 100) : null

    return {
      weekStart: monday.toISOString(),
      weekLabel: weekLabel(monday),
      completed,
      planned,
      pct,
    }
  })

  return NextResponse.json({ weeks })
}
