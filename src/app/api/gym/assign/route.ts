import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { templateId } = await req.json()

  if (!templateId) return NextResponse.json({ error: 'templateId requerido' }, { status: 400 })

  // Atletas con coach activo no pueden auto-asignarse rutinas
  const activeCoach = await prisma.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (activeCoach) {
    return NextResponse.json({ error: 'Tu coach gestiona tu rutina. Pídele que te asigne una.' }, { status: 403 })
  }

  // Verificar que la plantilla existe y es pública
  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, isPublic: true, isActive: true },
  })
  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })

  // Desactivar cualquier rutina activa anterior
  await prisma.assignedWorkout.updateMany({
    where: { athleteId, isActive: true },
    data: { isActive: false },
  })

  // Crear la auto-asignación (sin coachId)
  const assigned = await prisma.assignedWorkout.create({
    data: {
      templateId,
      athleteId,
      coachId: null,
      startDate: new Date(),
      isActive: true,
    },
  })

  return NextResponse.json({ ok: true, id: assigned.id })
}
