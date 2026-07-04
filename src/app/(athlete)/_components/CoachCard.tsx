import Link from 'next/link'

type Props = {
  name: string | null
  headline: string | null
  slug: string | null
}

export default function CoachCard({ name, headline, slug }: Props) {
  return (
    <section>
      <div className="bg-[#1e3a5f]/5 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold shrink-0">
          {(name ?? 'C').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{name ?? 'Tu coach'}</p>
          <p className="text-xs text-gray-500 truncate">
            {headline ?? 'Coach deportivo'}
          </p>
        </div>
        {slug && (
          <Link
            href={`/p/${slug}`}
            className="text-xs font-semibold text-[#1e3a5f] hover:text-[#ea580c] transition-colors shrink-0"
          >
            Ver perfil →
          </Link>
        )}
      </div>
    </section>
  )
}
