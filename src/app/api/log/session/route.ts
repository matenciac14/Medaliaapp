import { NextRequest, NextResponse } from 'next/server'

interface LogSessionBody {
  plannedSessionId: string
  completed: boolean
  rpe?: number
  distanceKm?: number
  durationMin?: number
  hrAvg?: number
  notes?: string
}

export async function POST(req: NextRequest) {
  const body: LogSessionBody = await req.json()

  // TODO: Guardar en BD — crear SessionLog en Prisma
  // const prisma = ...
  // await prisma.sessionLog.create({ data: { ...body, userId, date: new Date() } })

  console.log('[log/session] Recibido:', body)

  return NextResponse.json({ success: true })
}
