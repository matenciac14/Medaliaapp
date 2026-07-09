/**
 * Calcula el porcentaje de adherencia dado el número de sesiones completadas y el total.
 * Fuente canónica — evita implementaciones duplicadas en progress/page.tsx y mobile/progress.
 */
export function calcAdherencePct(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}
