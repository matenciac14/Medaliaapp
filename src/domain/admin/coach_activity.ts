/**
 * Lógica pura para detectar coaches activos en una ventana de tiempo.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 *
 * "Activo" = coach con al menos 1 mensaje enviado O pago creado/actualizado
 *            en la ventana de tiempo dada.
 */

export interface CoachActivityResult {
  /** IDs de coaches con actividad en la ventana */
  activeIds: Set<string>
  /** Total de coaches registrados */
  totalCount: number
  /** Coaches activos */
  activeCount: number
  /** Coaches sin actividad */
  inactiveCount: number
}

/**
 * Calcula el set de coaches activos combinando señales de mensajería y pagos.
 *
 * @param messageFromIds  - fromId de mensajes en la ventana (pueden incluir atletas)
 * @param paymentCoachIds - coachId de pagos creados/actualizados en la ventana
 * @param allCoachIds     - set de todos los IDs de coaches registrados (para filtrar falsos positivos)
 */
export function computeCoachActivity(
  messageFromIds: string[],
  paymentCoachIds: string[],
  allCoachIds: Set<string>,
): CoachActivityResult {
  const activeIds = new Set<string>()

  for (const id of messageFromIds) {
    if (allCoachIds.has(id)) activeIds.add(id)
  }
  for (const id of paymentCoachIds) {
    if (allCoachIds.has(id)) activeIds.add(id)
  }

  return {
    activeIds,
    totalCount: allCoachIds.size,
    activeCount: activeIds.size,
    inactiveCount: allCoachIds.size - activeIds.size,
  }
}
