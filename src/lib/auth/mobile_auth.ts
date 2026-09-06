import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import type { UserConfig } from '@/lib/config/user_config'

export type MobileTokenPayload = {
  id: string
  email: string
  name: string
  role: string
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'DELETED'
  onboardingCompleted: boolean
  userPlan: 'FREE' | 'PRO'
  features: UserConfig['features']
  sport?: string
}

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET not set')
  return new TextEncoder().encode(secret)
}

export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as MobileTokenPayload
}

export async function getMobileUser(req: NextRequest): Promise<MobileTokenPayload | null> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    return await verifyMobileToken(token)
  } catch (err) {
    console.error('[mobile-auth] Token verification failed:', err)
    return null
  }
}
