import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [profile, user] = await Promise.all([
    prisma.coachProfile.findUnique({
      where: { coachId: session.user.id },
      include: { programs: true, posts: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { identification: true, phoneWa: true, showPhoneWa: true },
    }),
  ])

  return NextResponse.json({ profile, identification: user?.identification ?? null, phoneWa: user?.phoneWa ?? null, showPhoneWa: user?.showPhoneWa ?? false })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    slug, bio, headline, city, country, whatsapp, instagram,
    yearsExp, specialties, certifications, isPublic, avatarUrl,
    primarySpecialty, identification, phoneWa,
  } = body

  const VALID_SPECIALTIES = ['RUNNING', 'GYM', 'NUTRITION', 'ALL']
  if (primarySpecialty !== undefined && !VALID_SPECIALTIES.includes(primarySpecialty)) {
    return NextResponse.json({ error: 'Especialidad inválida.' }, { status: 400 })
  }

  // Validate slug: lowercase letters, numbers, hyphens only
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'El slug solo puede contener letras minúsculas, números y guiones.' },
      { status: 400 }
    )
  }

  // Validate identification: 5–30 chars
  if (identification !== undefined) {
    const trimmed = (identification ?? '').trim()
    if (trimmed.length < 5 || trimmed.length > 30) {
      return NextResponse.json(
        { error: 'La identificación debe tener entre 5 y 30 caracteres.' },
        { status: 400 }
      )
    }
  }

  // Validate phoneWa: E.164 format
  if (phoneWa !== undefined && !/^\+[1-9]\d{7,14}$/.test(phoneWa ?? '')) {
    return NextResponse.json(
      { error: 'El número de WhatsApp debe estar en formato internacional (ej: +573001234567).' },
      { status: 400 }
    )
  }

  const coachId = session.user.id

  // Uniqueness checks + slug check in parallel
  const [slugConflict, idConflict, phoneConflict] = await Promise.all([
    slug
      ? prisma.coachProfile.findUnique({ where: { slug } })
      : Promise.resolve(null),
    identification !== undefined
      ? prisma.user.findFirst({
          where: { identification: identification.trim(), role: 'COACH', NOT: { id: coachId } },
          select: { id: true },
        })
      : Promise.resolve(null),
    phoneWa !== undefined
      ? prisma.user.findFirst({
          where: { phoneWa, role: 'COACH', NOT: { id: coachId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  if (slugConflict && slugConflict.coachId !== coachId) {
    return NextResponse.json({ error: 'Ese slug ya está en uso.' }, { status: 409 })
  }
  if (idConflict) {
    return NextResponse.json(
      { error: 'Ya existe un coach registrado con esa identificación.' },
      { status: 409 }
    )
  }
  if (phoneConflict) {
    return NextResponse.json(
      { error: 'Ya existe un coach registrado con ese número de WhatsApp.' },
      { status: 409 }
    )
  }

  // Persist identification + phoneWa in User if provided
  if (identification !== undefined || phoneWa !== undefined) {
    await prisma.user.update({
      where: { id: coachId },
      data: {
        ...(identification !== undefined && { identification: identification.trim() }),
        ...(phoneWa !== undefined && { phoneWa }),
      },
    })
  }

  let profile
  try {
    profile = await prisma.coachProfile.upsert({
      where: { coachId },
      create: {
        coachId,
        slug: slug ?? coachId,
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
        ...(primarySpecialty !== undefined && { primarySpecialty }),
      },
    })
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'P2002') {
      return NextResponse.json({ error: 'Ese slug ya está en uso.' }, { status: 409 })
    }
    throw err
  }

  return NextResponse.json({ profile })
}
