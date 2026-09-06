import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { logAdminAction } from '@/lib/admin/log_action'
import { ADMIN_ACTIONS } from '@/domain/admin/audit_log'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (adminUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Impedir auto-eliminación
  if (id === session.user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo.' }, { status: 400 })
  }

  // Leer datos del usuario ANTES del borrado para preservarlos en el audit log
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
  }

  // Registrar en audit log ANTES del delete (onDelete: SetNull vaciará targetUserId después)
  await logAdminAction(session.user.id, ADMIN_ACTIONS.DELETE_USER, id, {
    email: target.email,
    name:  target.name,
    role:  target.role,
  })

  // Borrar el usuario — cascade elimina CoachAthlete, TrainingPlan, CheckIns, etc.
  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
