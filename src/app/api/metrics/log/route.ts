import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// GET — últimos 30 registros del usuario
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await prisma.dailyLog.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
    take: 30,
  })

  return NextResponse.json(logs)
}

// POST — crear o actualizar registro del día
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, weightKg, hrResting, sleepHours, energyLevel, notes } = body

  if (!date) return NextResponse.json({ error: 'date requerido' }, { status: 400 })

  // PERSIST-10: solo sobreescribir campos que vienen definidos en el body
  const updateData = {
    ...(weightKg   !== undefined && { weightKg }),
    ...(hrResting  !== undefined && { hrResting }),
    ...(sleepHours !== undefined && { sleepHours }),
    ...(energyLevel !== undefined && { energyLevel }),
    ...(notes      !== undefined && { notes }),
  }
  const log = await prisma.dailyLog.upsert({
    where: { userId_date: { userId: session.user.id, date: new Date(date) } },
    create: {
      userId: session.user.id,
      date: new Date(date),
      weightKg: weightKg ?? null,
      hrResting: hrResting ?? null,
      sleepHours: sleepHours ?? null,
      energyLevel: energyLevel ?? null,
      notes: notes ?? null,
    },
    update: updateData,
  })

  return NextResponse.json(log)
}
