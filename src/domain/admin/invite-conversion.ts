/**
 * Lógica pura para calcular la tasa de conversión de invite codes.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 *
 * Tasa de conversión = usados / (usados + vencidos sin usar)
 * Los códigos aún activos se excluyen del denominador (no han tenido oportunidad de fallar).
 *
 * Tiempo promedio de uso = promedio de (usedAt - createdAt) para códigos usados.
 */

export interface InviteCodeData {
  coachId: string
  coachName: string | null
  status: 'activo' | 'usado' | 'vencido'
  createdAt: Date
  usedAt: Date | null
}

export interface ConversionStats {
  totalGenerated: number
  totalUsed: number
  totalExpiredUnused: number
  /** Tasa 0-100 sobre códigos con resultado final (usado o vencido). null si no hay datos. */
  conversionRate: number | null
  /** Promedio de horas entre generación y uso. null si ningún código fue usado. */
  avgHoursToUse: number | null
}

export interface CoachConversionRow {
  coachId: string
  coachName: string | null
  generated: number
  used: number
  expiredUnused: number
  conversionRate: number | null
}

export function computeOverallConversion(codes: InviteCodeData[]): ConversionStats {
  const totalGenerated    = codes.length
  const totalUsed         = codes.filter((c) => c.status === 'usado').length
  const totalExpiredUnused = codes.filter((c) => c.status === 'vencido').length

  const denominator = totalUsed + totalExpiredUnused
  const conversionRate = denominator > 0
    ? Math.round((totalUsed / denominator) * 100)
    : null

  const usedCodes = codes.filter((c) => c.status === 'usado' && c.usedAt !== null)
  const avgHoursToUse = usedCodes.length > 0
    ? Math.round(
        usedCodes.reduce((sum, c) => {
          const ms = c.usedAt!.getTime() - c.createdAt.getTime()
          return sum + ms / (1000 * 60 * 60)
        }, 0) / usedCodes.length
      )
    : null

  return { totalGenerated, totalUsed, totalExpiredUnused, conversionRate, avgHoursToUse }
}

export function computePerCoachConversion(codes: InviteCodeData[]): CoachConversionRow[] {
  const byCoach = new Map<string, { name: string | null; codes: InviteCodeData[] }>()

  for (const code of codes) {
    const entry = byCoach.get(code.coachId) ?? { name: code.coachName, codes: [] }
    entry.codes.push(code)
    byCoach.set(code.coachId, entry)
  }

  return [...byCoach.entries()]
    .map(([coachId, { name, codes: coachCodes }]) => {
      const used         = coachCodes.filter((c) => c.status === 'usado').length
      const expiredUnused = coachCodes.filter((c) => c.status === 'vencido').length
      const denom        = used + expiredUnused
      return {
        coachId,
        coachName: name,
        generated: coachCodes.length,
        used,
        expiredUnused,
        conversionRate: denom > 0 ? Math.round((used / denom) * 100) : null,
      }
    })
    .sort((a, b) => b.generated - a.generated)
}
