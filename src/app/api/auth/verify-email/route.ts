import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=token-invalido', req.url))
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!record) {
    return NextResponse.redirect(new URL('/login?error=token-invalido', req.url))
  }

  if (new Date() > record.expires) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
    return NextResponse.redirect(new URL('/login?error=token-expirado', req.url))
  }

  // identifier = email del usuario
  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true, emailVerified: true },
  })

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=usuario-no-encontrado', req.url))
  }

  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ])

  return NextResponse.redirect(new URL('/login?verified=1', req.url))
}
