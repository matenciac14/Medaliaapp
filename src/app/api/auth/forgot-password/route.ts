import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { prisma } from '@/lib/db/prisma'
import { sendPasswordResetEmail } from '@/infrastructure/email/resend'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Correo requerido.' }, { status: 400 })
  }

  // Always return 200 to avoid email enumeration
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true },
  })

  if (user) {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)
    const token = await new SignJWT({ purpose: 'set-password' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setExpirationTime('1h')
      .sign(secret)

    const resetLink = `${process.env.NEXTAUTH_URL ?? 'https://medaliq.com'}/set-password?token=${token}`

    await sendPasswordResetEmail(user.email, resetLink).catch(() => {
      // Log but don't expose email errors to client
      console.error('[forgot-password] Failed to send email to', user.email)
    })
  }

  return NextResponse.json({ ok: true })
}
