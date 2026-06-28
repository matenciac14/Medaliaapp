import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim()
  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!user || user.role !== 'ATHLETE') {
    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({ exists: true, user })
}
