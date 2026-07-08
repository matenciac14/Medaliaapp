import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { validateExercise } from '@/domain/admin/exercise'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return u?.role === 'ADMIN' ? session : null
}

// PATCH /api/admin/exercises/[id] — editar ejercicio global
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.exercise.findUnique({ where: { id }, select: { coachId: true } })
  if (!existing || existing.coachId !== null) {
    return NextResponse.json({ error: 'Ejercicio no encontrado o no es global.' }, { status: 404 })
  }

  const body = await req.json()
  const errors = validateExercise(body)
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const exercise = await prisma.exercise.update({
    where: { id },
    data: {
      name:        body.name.trim(),
      bodyPart:    body.bodyPart.trim(),
      target:      body.target.trim(),
      equipment:   body.equipment.trim(),
      mechanic:    body.mechanic?.trim() || null,
      description: body.description?.trim() || null,
      gifUrl:      body.gifUrl?.trim() || null,
    },
    select: { id: true, name: true, bodyPart: true, target: true, equipment: true },
  })

  return NextResponse.json({ exercise })
}

// DELETE /api/admin/exercises/[id] — eliminar ejercicio global
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.exercise.findUnique({ where: { id }, select: { coachId: true } })
  if (!existing || existing.coachId !== null) {
    return NextResponse.json({ error: 'Ejercicio no encontrado o no es global.' }, { status: 404 })
  }

  const usageCount = await prisma.workoutExercise.count({ where: { exerciseId: id } })
  if (usageCount > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: el ejercicio está en uso en rutinas de entrenadores.' },
      { status: 409 }
    )
  }

  await prisma.exercise.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
