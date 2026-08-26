/**
 * Shared utility for selecting the canonical active plan when duplicates exist.
 * Picks the plan with the most completed session logs; marks the rest as COMPLETED.
 * Used by both dashboard/page.tsx and plan/page.tsx.
 */

type PlanWithLogs = {
  id: string
  weeks: Array<{
    sessions: Array<{ log: unknown }>
  }>
}

export function selectActivePlan<T extends PlanWithLogs>(plans: T[]): { winner: T | null; loserIds: string[] } {
  if (plans.length === 0) return { winner: null, loserIds: [] }
  if (plans.length === 1) return { winner: plans[0], loserIds: [] }

  let winner = plans[0]
  let bestLogCount = plans[0].weeks.flatMap((w) => w.sessions).filter((s) => s.log !== null).length

  for (const p of plans.slice(1)) {
    const logCount = p.weeks.flatMap((w) => w.sessions).filter((s) => s.log !== null).length
    if (logCount > bestLogCount) {
      bestLogCount = logCount
      winner = p
    }
  }

  const loserIds = plans.filter((p) => p.id !== winner.id).map((p) => p.id)
  return { winner, loserIds }
}
