import Link from 'next/link'

type Props = {
  pendingMeals: string[] // e.g. ["Desayuno", "Almuerzo"]
}

export default function PendingMealsBanner({ pendingMeals }: Props) {
  if (pendingMeals.length === 0) return null

  const text = pendingMeals.length === 1
    ? `1 comida pendiente por registrar — ${pendingMeals[0]}`
    : `${pendingMeals.length} comidas pendientes por registrar — ${pendingMeals.join(' y ')}`

  return (
    <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
      <span className="text-base">🍽️</span>
      <p className="flex-1 text-sm text-orange-800 font-medium">{text}</p>
      <Link
        href="/nutrition#tracking"
        className="text-sm font-bold text-[#ea580c] hover:underline whitespace-nowrap"
      >
        Registrar →
      </Link>
    </div>
  )
}
