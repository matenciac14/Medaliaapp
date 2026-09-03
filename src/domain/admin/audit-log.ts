/**
 * Tipos y lógica pura para el audit trail de acciones admin.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

// Acciones auditables
export const ADMIN_ACTIONS = {
  CHANGE_ROLE:       'CHANGE_ROLE',
  CHANGE_PLAN:       'CHANGE_PLAN',
  DELETE_USER:       'DELETE_USER',
} as const

export type AdminAction = (typeof ADMIN_ACTIONS)[keyof typeof ADMIN_ACTIONS]

// Meta por tipo de acción
export type ChangeRoleMeta  = { from: string; to: string }
export type ChangePlanMeta  = { plan: string }
/**
 * Meta de DELETE_USER: preserva datos del usuario ANTES del borrado,
 * porque targetUserId quedará NULL (onDelete: SetNull) en el audit log.
 */
export type DeleteUserMeta  = { email: string; name: string | null; role: string }

export type AuditMeta = ChangeRoleMeta | ChangePlanMeta | DeleteUserMeta

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
    case ADMIN_ACTIONS.DELETE_USER:       return 'Eliminación'
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
    case ADMIN_ACTIONS.DELETE_USER: {
      // targetUserName puede ser null post-delete; usamos meta como fuente canónica
      const name  = (meta.name as string | null) ?? target
      const email = (meta.email as string) ?? ''
      return `Eliminó usuario: ${name}${email ? ` (${email})` : ''} — rol: ${meta.role ?? '?'}`
    }
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
    case ADMIN_ACTIONS.DELETE_USER:       return { bg: 'bg-red-100',    text: 'text-red-700'    }
    default:                              return { bg: 'bg-gray-100',   text: 'text-gray-600'   }
  }
}
