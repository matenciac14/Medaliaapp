/**
 * When an athlete completes a gym session (FUERZA type), auto-mark
 * the matching PlannedSession log so the training plan strip reflects it.
 *
 * Returns the created SessionLog id, or null if no matching session found.
 */

import { prisma } from '@/lib/db/prisma'
import { todayInTz } from '@/lib/core/date_utils'

export async function autoCompleteStrengthSession(params: {
  athleteId: string
  rpe?: number | null
  durationMin?: number | null
  notes?: string | null
  timezone?: string | null
}): Promise<string | null> {
  const { athleteId, rpe, durationMin, notes, timezone } = params
  const today = todayInTz(timezone)
  const todayEnd = new Date(today.getTime() + 86_400_000 - 1)

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

  try {
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
  } catch (err: unknown) {
    // P2002: duplicate SessionLog for the same plannedSession — already logged, skip silently
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
      return null
    }
    throw err
  }
}
