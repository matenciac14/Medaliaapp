import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

// GET /api/invite/[code] — valida el código y devuelve info del coach
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const invite = await prisma.inviteCode.findUnique({
    where: { code },
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          image: true,
          coachProfile: { select: { headline: true, specialties: true } },
        },
      },
    },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 404 })
  }
  if (invite.usedBy) {
    return NextResponse.json({ error: 'Este código ya fue usado.' }, { status: 410 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Este código expiró.' }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    coachName: invite.coach.name,
    coachHeadline: invite.coach.coachProfile?.headline ?? null,
  })
}

// POST /api/invite/[code] — redime el código (atleta autenticado)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  if ((session.user as any).role !== 'ATHLETE') {
    return NextResponse.json({ error: 'Solo atletas pueden usar este enlace.' }, { status: 403 })
  }

  const athleteId = session.user.id

  const invite = await prisma.inviteCode.findUnique({ where: { code } })

  if (!invite || invite.usedBy || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Código inválido o expirado.' }, { status: 400 })
  }

  // Verificar que no exista ya la relación
  const existing = await prisma.coachAthlete.findFirst({
    where: { coachId: invite.coachId, athleteId },
  })

  if (!existing) {
    await prisma.coachAthlete.create({
      data: { coachId: invite.coachId, athleteId },
    })
  }

  // Marcar código como usado
  await prisma.inviteCode.update({
    where: { code },
    data: { usedBy: athleteId, usedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
