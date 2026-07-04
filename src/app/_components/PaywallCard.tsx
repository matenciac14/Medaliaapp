import Link from 'next/link'

interface PaywallCardProps {
  emoji: string
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
}

export default function PaywallCard({
  emoji,
  title,
  description,
  ctaLabel = 'Ver planes → Pro $15/mes',
  ctaHref = '/upgrade',
}: PaywallCardProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full animate-fade-up">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)' }}
        >
          {emoji}
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ea580c 0%, #ea6c0a 100%)' }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}
