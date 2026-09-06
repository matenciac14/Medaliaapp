import Link from 'next/link'

type Props = {
  coachName: string | null
  planName: string | null
}

export default function CoachNutritionBanner({ coachName, planName }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
      {/* Coach info */}
      {coachName && (
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-bold">
            {coachName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-[#1e3a5f]">{coachName}</p>
            <p className="text-xs text-gray-400">Gestiona tu plan nutricional</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
        <span className="text-2xl">👨‍🍳</span>
        <div>
          <p className="text-sm font-bold text-[#1e3a5f]">Tu coach gestiona tu nutricion</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            El plan de comidas lo disena y actualiza tu entrenador. Tu registras lo que comes.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/nutrition#tracking"
          className="flex-1 flex items-center justify-center h-10 rounded-xl bg-[#ea580c] text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          + Registrar lo que comi
        </Link>
        <Link
          href="/nutrition/history"
          className="text-sm font-medium text-gray-500 hover:text-gray-700 self-center whitespace-nowrap"
        >
          Ver mi historial de comidas →
        </Link>
      </div>
    </div>
  )
}
