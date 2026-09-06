import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.healthProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      age:             true,
      heightCm:        true,
      weightKg:        true,
      gender:          true,
      dateOfBirth:     true,
      experienceLevel: true,
    },
  })

  if (!profile) {
    return NextResponse.json({ prefilled: null })
  }

  return NextResponse.json({ prefilled: profile })
}
