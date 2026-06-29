import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week-number'
import { sendSessionReminderEmail } from '@/infrastructure/email/resend'
import { sendPushNotification } from '@/lib/push'

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2',
  FARTLEK: 'Fartlek',
  TEMPO: 'Tempo',
  INTERVALOS: 'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  FUERZA: 'Fuerza',
  TEST: 'Test de rendimiento',
  SIMULACRO: 'Simulacro de carrera',
  OTRO: 'Entrenamiento',
}

// Cron: lunes 12:00 UTC = 07:00 COT
// Envia a atletas con plan activo cuya sesión del lunes no es descanso
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // dayOfWeek 1 = lunes (mismo valor que JS getDay() para lunes)
  const MONDAY = 1

  const activePlans = await prisma.trainingPlan.findMany({
    where: { status: 'ACTIVE' },
    select: {
      startDate: true,
      totalWeeks: true,
      user: { select: { email: true, name: true, pushToken: true } },
      weeks: {
        select: {
          weekNumber: true,
          sessions: {
            where: { dayOfWeek: MONDAY },
            select: { type: true, durationMin: true, detailText: true },
          },
        },
      },
    },
  })

  let sent = 0
  let failed = 0
  for (const plan of activePlans) {
    const currentWeek = getPlanWeekNumber(plan.startDate, plan.totalWeeks)
    const week = plan.weeks.find(w => w.weekNumber === currentWeek)
    const session = week?.sessions[0]
    if (!session || session.type === 'DESCANSO') continue

    try {
      const typeLabel = SESSION_LABELS[session.type] ?? session.type
      await sendSessionReminderEmail(plan.user.email!, plan.user.name ?? 'Atleta', {
        typeLabel,
        durationMin: session.durationMin,
        detail: session.detailText,
      })
      const pushBody = session.durationMin
        ? `${typeLabel} · ${session.durationMin} min — ¡a entrenar!`
        : `${typeLabel} — ¡a entrenar!`
      sendPushNotification(plan.user.pushToken, 'Sesión de hoy 🏃', pushBody, { screen: 'plan' }).catch(() => {})
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed })
}
