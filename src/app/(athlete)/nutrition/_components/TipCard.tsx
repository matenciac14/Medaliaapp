// NUT-DASH-06 — TipCard contextual según tipo de día
// Sin DB — determinista por todayDayType

type DayType = 'hard' | 'easy' | 'low' | 'rest'

const TIPS: Record<DayType, { icon: string; title: string; body: string }> = {
  hard: {
    icon:  '⚡',
    title: 'Carbos antes del gym',
    body:  'Consume avena o arroz 60 min antes del entreno. Máximo rendimiento.',
  },
  easy: {
    icon:  '💪',
    title: 'Proteína post-sesión',
    body:  '30 g en los 30 min post-entreno. Facilita la recuperación muscular.',
  },
  low: {
    icon:  '🌿',
    title: 'Día suave — recarga bien',
    body:  'Prioriza proteína y verduras. Tu cuerpo recupera en los días de baja intensidad.',
  },
  rest: {
    icon:  '💧',
    title: 'Hidratación activa',
    body:  'Mantente en 2 L aunque no entrenes. Activa la recuperación.',
  },
}

export default function TipCard({ dayType }: { dayType: DayType | null }) {
  if (!dayType) return null
  const tip = TIPS[dayType]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-start gap-3">
      <span className="text-2xl leading-none mt-0.5 shrink-0">{tip.icon}</span>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Consejo del día</p>
        <p className="text-sm font-bold text-gray-900">{tip.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{tip.body}</p>
      </div>
    </div>
  )
}
