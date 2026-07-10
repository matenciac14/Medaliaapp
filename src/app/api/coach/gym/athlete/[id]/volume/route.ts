import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getSundayOf(monday: Date): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

// Carga semanal = sum(weightKg × repsCompleted) de sets WORK completados
function computeVolume(sets: { weightKg: number | null; repsCompleted: number | null; completed: boolean; setLogType: string }[]): number {
  return sets.reduce((acc, s) => {
    if (!s.completed || s.setLogType === 'WARMUP') return acc
    return acc + (s.weightKg ?? 0) * (s.repsCompleted ?? 0)
  }, 0)
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

  const thisMonday = getMondayOf(new Date())
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)

  const [thisWeekSessions, lastWeekSessions] = await Promise.all([
    prisma.gymSession.findMany({
      where: { athleteId, completed: true, date: { gte: thisMonday, lte: getSundayOf(thisMonday) } },
      select: {
        setLogs: { select: { weightKg: true, repsCompleted: true, completed: true, setLogType: true } },
      },
    }),
    prisma.gymSession.findMany({
      where: { athleteId, completed: true, date: { gte: lastMonday, lte: getSundayOf(lastMonday) } },
      select: {
        setLogs: { select: { weightKg: true, repsCompleted: true, completed: true, setLogType: true } },
      },
    }),
  ])

  const thisWeekKg = computeVolume(thisWeekSessions.flatMap(s => s.setLogs))
  const lastWeekKg = computeVolume(lastWeekSessions.flatMap(s => s.setLogs))
  const deltaPct    = lastWeekKg > 0 ? Math.round(((thisWeekKg - lastWeekKg) / lastWeekKg) * 100) : null
  const alert       = deltaPct !== null && deltaPct > 20

  return NextResponse.json({
    thisWeekKg:  Math.round(thisWeekKg),
    lastWeekKg:  Math.round(lastWeekKg),
    deltaPct,
    alert,
  })
}
