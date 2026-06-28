import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { COACH_CONFIG, DEFAULT_USER_CONFIG } from '@/lib/config/user-config'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { role } = await req.json()
  if (role !== 'ATHLETE' && role !== 'COACH') {
    return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
  }

  const initialConfig = role === 'COACH' ? COACH_CONFIG : DEFAULT_USER_CONFIG

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role, config: initialConfig as object },
  })

  return NextResponse.json({ ok: true, role })
}
