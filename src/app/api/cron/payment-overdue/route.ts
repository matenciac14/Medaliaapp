import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendPaymentOverdueCoachEmail } from '@/infrastructure/email/resend'

// Cron: diario 14:00 UTC = 09:00 COT
// Marca PENDING→OVERDUE y notifica a cada coach con pagos vencidos nuevos
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Encontrar pagos PENDING vencidos antes de actualizar (para saber a quién notificar)
  const newlyOverdue = await prisma.payment.findMany({
    where: { status: 'PENDING', dueDate: { lt: now } },
    select: {
      coachId: true,
      amount: true,
      currency: true,
      dueDate: true,
      athlete: { select: { name: true } },
      coach: { select: { email: true, name: true } },
    },
  })

  if (newlyOverdue.length === 0) {
    return NextResponse.json({ marked: 0, sent: 0 })
  }

  // Marcar todos como OVERDUE
  await prisma.payment.updateMany({
    where: { status: 'PENDING', dueDate: { lt: now } },
    data: { status: 'OVERDUE' },
  })

  // Agrupar por coach y enviar un email por coach
  const byCoach = new Map<string, typeof newlyOverdue>()
  for (const p of newlyOverdue) {
    const list = byCoach.get(p.coachId) ?? []
    list.push(p)
    byCoach.set(p.coachId, list)
  }

  let sent = 0
  let failed = 0
  for (const [, items] of byCoach) {
    const { email, name } = items[0].coach
    if (!email) continue
    try {
      await sendPaymentOverdueCoachEmail(
        email,
        name ?? 'Coach',
        items.map(i => ({
          athleteName: i.athlete.name ?? 'Atleta',
          amount: i.amount,
          currency: i.currency,
          dueDate: i.dueDate,
        })),
      )
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ marked: newlyOverdue.length, sent, failed })
}
