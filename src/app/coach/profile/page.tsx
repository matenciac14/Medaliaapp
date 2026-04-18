import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import ProfileSection from './_components/ProfileSection'

export default async function CoachProfilePage() {
  const session = await auth()
  if (!session?.user?.id || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const profile = await prisma.coachProfile.findUnique({
    where: { coachId: session.user.id },
    include: {
      programs: { orderBy: { createdAt: 'desc' } },
      posts: { orderBy: { createdAt: 'desc' } },
    },
  })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil público</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Así te ven los atletas en el directorio de Medaliq
          </p>
        </div>
        {profile?.isPublic && profile?.slug && (
          <a
            href={`/p/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#1e3a5f] hover:underline"
          >
            Ver mi perfil público →
          </a>
        )}
      </div>

      <ProfileSection
        initialProfile={profile ? {
          id: profile.id,
          slug: profile.slug,
          bio: profile.bio,
          headline: profile.headline,
          specialties: profile.specialties,
          city: profile.city,
          country: profile.country,
          whatsapp: profile.whatsapp,
          instagram: profile.instagram,
          yearsExp: profile.yearsExp,
          certifications: profile.certifications,
          isPublic: profile.isPublic,
        } : null}
        initialPrograms={profile?.programs ?? []}
        initialPosts={(profile?.posts ?? []).map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))}
      />
    </div>
  )
}
