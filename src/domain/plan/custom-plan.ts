/**
 * Lógica pura para crear planes desde el constructor visual del coach.
 * Sin dependencias de Prisma ni Next.js — 100% testeable.
 */

export type CustomPlanWeekInput = {
  planId: string
  weekNumber: number
  phase: 'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO'
  startDate: Date
  endDate: Date
  isRecoveryWeek: boolean
  focusDescription: null
}

// Progresión de fases: ciclos de 2 semanas por fase
const PHASE_CYCLE: Array<'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO'> = [
  'BASE', 'BASE',
  'DESARROLLO', 'DESARROLLO',
  'ESPECIFICO', 'ESPECIFICO',
  'AFINAMIENTO', 'AFINAMIENTO',
]

export function resolvePhase(weekIndex: number): 'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO' {
  return PHASE_CYCLE[weekIndex % PHASE_CYCLE.length]
}

export function buildCustomPlanWeeks(planId: string, startDate: Date, totalWeeks: number): CustomPlanWeekInput[] {
  return Array.from({ length: totalWeeks }, (_, i) => {
    const weekStart = new Date(startDate)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    return {
      planId,
      weekNumber: i + 1,
      phase: resolvePhase(i),
      startDate: weekStart,
      endDate: weekEnd,
      isRecoveryWeek: false,
      focusDescription: null,
    }
  })
}

export function calcPlanEndDate(startDate: Date, totalWeeks: number): Date {
  const end = new Date(startDate)
  end.setDate(end.getDate() + totalWeeks * 7)
  return end
}
