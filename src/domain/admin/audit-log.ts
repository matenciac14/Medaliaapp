/**
 * Tipos y lógica pura para el audit trail de acciones admin.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

// Acciones auditables
export const ADMIN_ACTIONS = {
  CHANGE_ROLE:       'CHANGE_ROLE',
  CHANGE_PLAN:       'CHANGE_PLAN',
  UPDATE_AI_PROFILE: 'UPDATE_AI_PROFILE',
} as const

export type AdminAction = (typeof ADMIN_ACTIONS)[keyof typeof ADMIN_ACTIONS]

// Meta por tipo de acción
export type ChangeRoleMeta  = { from: string; to: string }
export type ChangePlanMeta  = { plan: string }
export type UpdateAiMeta    = Record<string, never>

export type AuditMeta = ChangeRoleMeta | ChangePlanMeta | UpdateAiMeta

export type AuditEntry = {
  id: string
  action: string
  adminId: string
  adminName: string | null
  targetUserId: string | null
  targetUserName: string | null
  meta: Record<string, unknown> | null
  createdAt: Date
}

/**
 * Etiqueta corta legible para una acción admin.
 */
export function labelForAction(action: string): string {
  switch (action) {
    case ADMIN_ACTIONS.CHANGE_ROLE:       return 'Cambio de rol'
    case ADMIN_ACTIONS.CHANGE_PLAN:       return 'Cambio de plan'
    case ADMIN_ACTIONS.UPDATE_AI_PROFILE: return 'Actualización AI'
    default:                              return action
  }
}

/**
 * Descripción larga del evento para mostrar en el feed.
 */
export function describeAuditEntry(entry: Pick<AuditEntry, 'action' | 'meta' | 'targetUserName'>): string {
  const target = entry.targetUserName ?? 'usuario desconocido'
  const meta   = entry.meta ?? {}

  switch (entry.action) {
    case ADMIN_ACTIONS.CHANGE_ROLE:
      return `Cambió rol de ${target}: ${meta.from ?? '?'} → ${meta.to ?? '?'}`
    case ADMIN_ACTIONS.CHANGE_PLAN:
      return `Cambió plan de ${target} a ${meta.plan ?? '?'}`
    case ADMIN_ACTIONS.UPDATE_AI_PROFILE:
      return 'Actualizó el perfil de IA del sistema'
    default:
      return `Acción: ${entry.action}`
  }
}

/**
 * Color de badge según la acción.
 */
export function colorForAction(action: string): { bg: string; text: string } {
  switch (action) {
    case ADMIN_ACTIONS.CHANGE_ROLE:       return { bg: 'bg-blue-100',   text: 'text-blue-700'   }
    case ADMIN_ACTIONS.CHANGE_PLAN:       return { bg: 'bg-orange-100', text: 'text-orange-700' }
    case ADMIN_ACTIONS.UPDATE_AI_PROFILE: return { bg: 'bg-purple-100', text: 'text-purple-700' }
    default:                              return { bg: 'bg-gray-100',   text: 'text-gray-600'   }
  }
}
