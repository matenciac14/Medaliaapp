import { prisma } from '@/lib/db/prisma'
import type { AdminAction, AuditMeta } from '@/domain/admin/audit_log'

/**
 * Registra una acción admin en el audit trail.
 * Fire-and-forget — el await es opcional para no bloquear la respuesta.
 */
export function logAdminAction(
  adminId: string,
  action: AdminAction,
  targetUserId?: string | null,
  meta?: AuditMeta | null,
): Promise<void> {
  return prisma.adminAuditLog
    .create({
      data: {
        adminId,
        action,
        targetUserId: targetUserId ?? null,
        meta: meta ?? undefined,
      },
    })
    .then(() => undefined)
    .catch((err) => {
      // No bloquear la respuesta por un fallo en el audit log
      console.error('[audit] logAdminAction failed:', err)
    })
}
