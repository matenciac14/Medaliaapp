/**
 * When an athlete completes a gym session (FUERZA type), auto-mark
 * the matching PlannedSession log so the training plan strip reflects it.
 *
 * Returns the created SessionLog id, or null if no matching session found.
 */

import { prisma } from '@/lib/db/prisma'

export async function autoCompleteStrengthSession(params: {
  athleteId: string
  rpe?: number | null
  durationMin?: number | null
  notes?: string | null
}): Promise<string | null> {
  const { athleteId, rpe, durationMin, notes } = params
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)

  const fuerzaSession = await prisma.plannedSession.findFirst({
    where: {
      week: { plan: { userId: athleteId, status: 'ACTIVE' } },
      type: 'FUERZA',
      date: { gte: today, lte: todayEnd },
      log: null,
    },
    select: { id: true },
  })

  if (!fuerzaSession) return null

  const log = await prisma.sessionLog.create({
    data: {
      userId: athleteId,
      plannedSessionId: fuerzaSession.id,
      completedAt: new Date(),
      rpe: rpe ?? null,
      durationMin: durationMin ?? null,
      notes: notes ?? null,
    },
    select: { id: true },
  })

  return log.id
}
