import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.coachProfile.findUnique({
    where: { coachId: session.user.id },
    include: { programs: true, posts: true },
  })

  return NextResponse.json({ profile })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    slug, bio, headline, city, country, whatsapp, instagram,
    yearsExp, specialties, certifications, isPublic, avatarUrl,
  } = body

  // Validate slug: lowercase letters, numbers, hyphens only
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'El slug solo puede contener letras minúsculas, números y guiones.' },
      { status: 400 }
    )
  }

  // Check slug uniqueness (exclude current coach)
  if (slug) {
    const existing = await prisma.coachProfile.findUnique({ where: { slug } })
    if (existing && existing.coachId !== session.user.id) {
      return NextResponse.json({ error: 'Ese slug ya está en uso.' }, { status: 409 })
    }
  }

  const profile = await prisma.coachProfile.upsert({
    where: { coachId: session.user.id },
    create: {
      coachId: session.user.id,
      slug: slug ?? session.user.id,
      bio: bio ?? null,
      avatarUrl: avatarUrl ?? null,
      headline: headline ?? null,
      specialties: specialties ?? [],
      city: city ?? null,
      country: country ?? 'CO',
      whatsapp: whatsapp ?? null,
      instagram: instagram ?? null,
      yearsExp: yearsExp ? parseInt(yearsExp) : null,
      certifications: certifications ?? [],
      isPublic: isPublic ?? false,
    },
    update: {
      ...(slug !== undefined && { slug }),
      ...(bio !== undefined && { bio }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(headline !== undefined && { headline }),
      ...(specialties !== undefined && { specialties }),
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country }),
      ...(whatsapp !== undefined && { whatsapp }),
      ...(instagram !== undefined && { instagram }),
      ...(yearsExp !== undefined && { yearsExp: yearsExp ? parseInt(yearsExp) : null }),
      ...(certifications !== undefined && { certifications }),
      ...(isPublic !== undefined && { isPublic }),
    },
  })

  return NextResponse.json({ profile })
}
