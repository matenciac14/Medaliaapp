import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

function generateTempPassword(length = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: athleteId } = await params
  const coachId = session.user.id

  const relation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId, athleteId } },
  })
  if (!relation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tempPassword = generateTempPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  await prisma.user.update({
    where: { id: athleteId },
    data: { password: hashedPassword },
  })

  return NextResponse.json({ ok: true, tempPassword })
}
