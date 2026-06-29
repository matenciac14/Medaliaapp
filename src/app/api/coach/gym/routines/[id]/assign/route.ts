import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

interface AssignBody {
  athleteId: string
  startDate: string
  weeksDuration?: number | null
  notes?: string | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id
  const { id: templateId } = await params

  const body: AssignBody = await req.json()
  const { athleteId, startDate, weeksDuration, notes } = body

  if (!athleteId || !startDate) {
    return NextResponse.json({ error: 'athleteId y startDate son obligatorios' }, { status: 400 })
  }

  // Verify the coach owns this template
  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, coachId },
    select: { id: true },
  })

  if (!template) {
    return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
  }

  // Verify the coach has this athlete
  const relation = await prisma.coachAthlete.findFirst({
    where: { coachId, athleteId },
    select: { id: true },
  })

  if (!relation) {
    return NextResponse.json(
      { error: 'Este atleta no está vinculado a tu cuenta' },
      { status: 403 }
    )
  }

  // Deactivate ALL active assignments for this athlete (un atleta = una rutina activa)
  await prisma.assignedWorkout.updateMany({
    where: { athleteId, isActive: true },
    data: { isActive: false },
  })

  const start = new Date(startDate)
  let endDate: Date | null = null

  if (weeksDuration && weeksDuration > 0) {
    endDate = new Date(start)
    endDate.setDate(endDate.getDate() + weeksDuration * 7)
  }

  const assignment = await prisma.assignedWorkout.create({
    data: {
      templateId,
      athleteId,
      coachId,
      startDate: start,
      endDate: endDate,
      weeksDuration: weeksDuration ?? null,
      isActive: true,
      notes: notes ?? null,
    },
  })

  return NextResponse.json(assignment, { status: 201 })
}

// DELETE /api/coach/gym/routines/[id]/assign — desactivar asignación sin reemplazar
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const coachId = session.user.id
  const { id: templateId } = await params
  const { athleteId } = await req.json()

  if (!athleteId) return NextResponse.json({ error: 'athleteId requerido' }, { status: 400 })

  const [template, relation] = await Promise.all([
    prisma.workoutTemplate.findFirst({ where: { id: templateId, coachId }, select: { id: true } }),
    prisma.coachAthlete.findFirst({ where: { coachId, athleteId }, select: { id: true } }),
  ])

  if (!template) return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 })
  if (!relation) return NextResponse.json({ error: 'Este atleta no está vinculado a tu cuenta' }, { status: 403 })

  await prisma.assignedWorkout.updateMany({
    where: { athleteId, templateId, isActive: true },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
