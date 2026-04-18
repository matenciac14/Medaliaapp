import { prisma } from '@/lib/db/prisma'
import { auth } from '@/auth'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { JoinProgramButton } from '@/app/p/_components/JoinProgramButton'

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function sportLabel(s: string): string {
  const map: Record<string, string> = {
    RUNNING: 'Running',
    GYM: 'Gym',
    CYCLING: 'Ciclismo',
    TRIATHLON: 'Triatlón',
    FUNCTIONAL: 'Funcional',
  }
  return map[s] ?? s
}

function levelLabel(l: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'Principiante',
    INTERMEDIATE: 'Intermedio',
    ADVANCED: 'Avanzado',
  }
  return map[l] ?? l
}

function postTypeLabel(t: string): string {
  const map: Record<string, string> = {
    TIP: 'Tip',
    ROUTINE_SHOWCASE: 'Rutina',
    ACHIEVEMENT: 'Logro',
    ANNOUNCEMENT: 'Anuncio',
  }
  return map[t] ?? t
}

function postTypeColor(t: string): string {
  const map: Record<string, string> = {
    TIP: 'bg-blue-50 text-blue-700',
    ROUTINE_SHOWCASE: 'bg-purple-50 text-purple-700',
    ACHIEVEMENT: 'bg-green-50 text-green-700',
    ANNOUNCEMENT: 'bg-orange-50 text-orange-700',
  }
  return map[t] ?? 'bg-gray-50 text-gray-700'
}

export default async function CoachProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (slug === 'ai-coach') {
    redirect('/p/ai-coach')
  }

  const profile = await prisma.coachProfile.findFirst({
    where: { slug, isPublic: true },
    include: {
      coach: { select: { name: true } },
      programs: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      posts: {
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!profile) notFound()

  const athleteCount = await prisma.coachAthlete.count({
    where: { coachId: profile.coachId },
  })

  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[#1e3a5f]">Medaliq</Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/coaches" className="hover:text-[#1e3a5f] transition-colors">Coaches</Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="hover:text-[#1e3a5f]">Mi panel</Link>
            ) : (
              <Link href="/login" className="hover:text-[#1e3a5f]">Iniciar sesión</Link>
            )}
          </div>
          <Link href="/onboarding">
            <span className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
              Empieza gratis
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.coach.name ?? ''}
              className="w-24 h-24 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-2xl shrink-0">
              {initials(profile.coach.name)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-[#1e3a5f] mb-1">{profile.coach.name}</h1>
            {profile.headline && (
              <p className="text-gray-500 text-base mb-3">{profile.headline}</p>
            )}
            <div className="flex flex-wrap gap-2 text-sm text-gray-400 mb-3">
              {profile.city && (
                <span>
                  {profile.city}
                  {profile.country ? `, ${profile.country}` : ''}
                </span>
              )}
              {profile.yearsExp && <span>· {profile.yearsExp} años de experiencia</span>}
            </div>
            {profile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.specialties.map((s) => (
                  <span key={s} className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">
                    {sportLabel(s)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[#1e3a5f] mb-2">Sobre el coach</h2>
            <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-[#1e3a5f]">{athleteCount}</div>
            <div className="text-xs text-gray-400 mt-1">Atletas activos</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-[#1e3a5f]">{profile.yearsExp ?? '—'}</div>
            <div className="text-xs text-gray-400 mt-1">Años de exp.</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-[#1e3a5f]">{profile.programs.length}</div>
            <div className="text-xs text-gray-400 mt-1">Programas</div>
          </div>
        </div>

        {/* Programs */}
        {profile.programs.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-[#1e3a5f] mb-4">Programas disponibles</h2>
            <div className="flex flex-col gap-4">
              {profile.programs.map((program) => (
                <div
                  key={program.id}
                  className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-[#1e3a5f] text-base mb-1">{program.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">
                          {sportLabel(program.sport)}
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                          {levelLabel(program.level)}
                        </span>
                        {program.durationWeeks && (
                          <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                            {program.durationWeeks} semanas
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {program.priceMonth ? (
                        <>
                          <div className="text-2xl font-extrabold text-[#1e3a5f]">
                            ${program.priceMonth}
                          </div>
                          <div className="text-xs text-gray-400">{program.currency}/mes</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">Precio a consultar</div>
                      )}
                    </div>
                  </div>
                  {program.description && (
                    <p className="text-gray-500 text-sm mb-3">{program.description}</p>
                  )}
                  {program.includes.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {program.includes.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-[#f97316]">✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isLoggedIn ? (
                    <JoinProgramButton profileId={profile.id} programId={program.id} />
                  ) : (
                    <Link href={`/register?coach=${slug}`}>
                      <span className="inline-block bg-[#f97316] hover:bg-[#ea6c0a] text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
                        Unirme a este programa
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts */}
        {profile.posts.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-[#1e3a5f] mb-4">Publicaciones recientes</h2>
            <div className="flex flex-col gap-3">
              {profile.posts.map((post) => (
                <div key={post.id} className="border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 font-medium ${postTypeColor(post.type)}`}
                    >
                      {postTypeLabel(post.type)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(post.createdAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1e3a5f] text-sm mb-1">{post.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {post.body.length > 150 ? post.body.slice(0, 150) + '…' : post.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(profile.whatsapp || profile.instagram) && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#1e3a5f] mb-3">Contacto</h2>
            <div className="flex flex-wrap gap-3">
              {profile.whatsapp && (
                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-100 transition-colors"
                >
                  WhatsApp
                </a>
              )}
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-pink-50 text-pink-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-pink-100 transition-colors"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar — non-authenticated only */}
      {!isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600 hidden sm:block">
              Listo para entrenar con {profile.coach.name}?
            </p>
            <Link href={`/register?coach=${slug}`}>
              <span className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">
                Crea tu cuenta gratis
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
