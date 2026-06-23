import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json()

  if (!token || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Token y contraseña (mín. 8 caracteres) requeridos.' }, { status: 400 })
  }

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)
  let userId: string

  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== 'set-password' || typeof payload.sub !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }
    userId = payload.sub
  } catch {
    return NextResponse.json({ error: 'El link expiró o no es válido. Pide a tu coach un nuevo link.' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  })

  return NextResponse.json({ ok: true })
}
