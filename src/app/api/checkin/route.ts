import { NextRequest, NextResponse } from 'next/server'

interface CheckInBody {
  weightKg?: number
  hrResting?: number
  sleepHours?: number
  sleepScore?: number
  hardestRpe: number
  adherencePct: number
  hasPain: boolean
  painDescription?: string
  energyLevel: number
  notes?: string
  // Para comparacion con semana anterior (se calcularia en BD)
  previousWeightKg?: number
  previousHrResting?: number
}

function evaluateAlerts(data: CheckInBody): string[] {
  const alerts: string[] = []

  if (data.hrResting && data.previousHrResting && data.hrResting > data.previousHrResting * 1.10) {
    alerts.push('FC reposo elevada — considera un dia extra de descanso')
  }
  if (data.sleepScore && data.sleepScore < 70) {
    alerts.push('Sleep score bajo — revisa tus habitos de sueno')
  }
  if (data.weightKg && data.previousWeightKg && (data.previousWeightKg - data.weightKg) > 1.2) {
    alerts.push('Bajaste mas de 1.2kg esta semana — aumenta 200-300 kcal')
  }
  if (data.adherencePct !== undefined && data.adherencePct < 40) {
    alerts.push('Adherencia baja — necesitas ajustar la carga del plan?')
  }

  return alerts
}

export async function POST(req: NextRequest) {
  const body: CheckInBody = await req.json()

  // TODO: Guardar en BD — crear WeeklyCheckIn en Prisma
  // const prisma = ...
  // await prisma.weeklyCheckIn.create({ data: { ...body, userId, weekNumber, date: new Date() } })

  const alerts = evaluateAlerts(body)

  console.log('[checkin] Recibido:', body)
  console.log('[checkin] Alertas:', alerts)

  return NextResponse.json({ success: true, alerts })
}
