import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

async function verifyCoach(coachId: string, athleteId: string) {
  return prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId } },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: athleteId } = await params
  if (!await verifyCoach(session.user.id, athleteId)) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  const benchmarks = await prisma.performanceBenchmark.findMany({
    where: { userId: athleteId },
    orderBy: [{ sport: 'asc' }, { testedAt: 'desc' }],
  })

  return NextResponse.json({ benchmarks })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: athleteId } = await params
  if (!await verifyCoach(session.user.id, athleteId)) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  const body = await req.json() as {
    sport: string
    metric: string
    value: number
    unit: string
    testedAt: string
    notes?: string
  }

  if (!body.sport || !body.metric || body.value == null || !body.unit || !body.testedAt) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const benchmark = await prisma.performanceBenchmark.create({
    data: {
      userId: athleteId,
      coachId: session.user.id,
      sport: body.sport,
      metric: body.metric,
      value: body.value,
      unit: body.unit,
      testedAt: new Date(body.testedAt),
      notes: body.notes ?? null,
    },
  })

  return NextResponse.json({ benchmark }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: athleteId } = await params
  if (!await verifyCoach(session.user.id, athleteId)) {
    return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
  }

  const { benchmarkId } = await req.json() as { benchmarkId: string }
  if (!benchmarkId) {
    return NextResponse.json({ error: 'benchmarkId requerido' }, { status: 400 })
  }

  const existing = await prisma.performanceBenchmark.findFirst({
    where: { id: benchmarkId, userId: athleteId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Benchmark no encontrado' }, { status: 404 })
  }

  await prisma.performanceBenchmark.delete({ where: { id: benchmarkId } })
  return NextResponse.json({ ok: true })
}
