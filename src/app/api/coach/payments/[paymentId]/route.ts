import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// PATCH /api/coach/payments/[paymentId] — actualizar estado (PAID/PENDING)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { paymentId } = await params
  const body = await req.json() as { status?: string; paidAt?: string }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, coachId: session.user.id },
  })
  if (!payment) {
    return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 })
  }

  const { status, paidAt } = body
  if (!status || !['PENDING', 'PAID'].includes(status)) {
    return NextResponse.json({ error: 'status inválido.' }, { status: 400 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: status as 'PENDING' | 'PAID',
        paidAt: status === 'PAID' ? (paidAt ? new Date(paidAt) : new Date()) : null,
      },
      include: { athlete: { select: { id: true, name: true, email: true } } },
    })
    await tx.paymentAuditLog.create({
      data: { paymentId, action: 'MARKED_PAID', actorId: session.user.id },
    })
    return result
  })

  return NextResponse.json({ payment: updated })
}

// DELETE /api/coach/payments/[paymentId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { paymentId } = await params

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, coachId: session.user.id },
  })
  if (!payment) {
    return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 })
  }

  await prisma.payment.delete({ where: { id: paymentId } })
  return NextResponse.json({ ok: true })
}
