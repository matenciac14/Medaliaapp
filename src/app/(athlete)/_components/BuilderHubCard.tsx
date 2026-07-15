import Link from 'next/link'
import { Dumbbell, Salad } from 'lucide-react'

export default function BuilderHubCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Crea tu rutina
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/gym/builder"
          className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-200 p-4 hover:border-[#ea580c] hover:bg-orange-50 transition-colors group"
        >
          <Dumbbell size={24} className="text-[#ea580c]" />
          <span className="text-sm font-semibold text-gray-700 group-hover:text-[#ea580c] text-center">
            Rutina de gym
          </span>
          <span className="text-[10px] text-gray-400 text-center leading-tight">
            Ejercicios por día
          </span>
        </Link>
        <Link
          href="/nutrition/builder"
          className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-200 p-4 hover:border-green-500 hover:bg-green-50 transition-colors group"
        >
          <Salad size={24} className="text-green-600" />
          <span className="text-sm font-semibold text-gray-700 group-hover:text-green-700 text-center">
            Plan nutricional
          </span>
          <span className="text-[10px] text-gray-400 text-center leading-tight">
            Comidas por tipo de día
          </span>
        </Link>
      </div>
    </div>
  )
}
