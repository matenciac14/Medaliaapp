import Link from 'next/link'

type Props = {
  firstName: string
  isNewUser: boolean
  completedPlanName: string | null
  streakDays: number
  weekSessionCount: number
  sport?: string | null
}

export default function FreeDashboard({
  firstName,
  isNewUser,
  completedPlanName,
  streakDays,
  weekSessionCount,
  sport,
}: Props) {
  const isRunner = sport === 'RUNNING' || sport === 'BOTH'
  const isGym = sport === 'STRENGTH'
  return (
    <div className="space-y-5">

      {/* Welcome header */}
      <div className="text-center py-4">
        {isNewUser ? (
          <>
            <div className="text-4xl mb-3">{isRunner ? '🏃' : isGym ? '🏋️' : '💪'}</div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">
              Tu espacio de entrenamiento está listo, {firstName}
            </h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              {isRunner
                ? 'Registra tus sesiones de running, nutrición y evolución semana a semana.'
                : isGym
                ? 'Registra tus sesiones de gym, pesos y PRs. El sistema lleva el historial por ti.'
                : 'Registra tu actividad deportiva y nutrición. Empieza solo o conéctate con un entrenador.'}
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-4">
              <span className="text-base">🏆</span>
              <span className="text-sm font-semibold text-green-800">Completaste: {completedPlanName}</span>
            </div>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">¿Qué sigue?</h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              Sigue entrenando libre o consigue un nuevo plan con un entrenador.
            </p>
          </>
        )}

        {/* Badges */}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {streakDays >= 2 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-600">
              🔥 {streakDays} días seguidos
            </span>
          )}
          {weekSessionCount > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-600">
              {weekSessionCount} {weekSessionCount === 1 ? 'sesión' : 'sesiones'} esta semana
            </span>
          )}
        </div>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {isRunner ? (
          <Link href="/log" className="group block">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#ea580c]/40 transition-all p-5 h-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#ea580c]/10 flex items-center justify-center text-2xl shrink-0">
                  🏃
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[#1e3a5f] mb-1">Registrar sesión</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Rodaje, fartlek, tirada larga — lleva el control de cada salida
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#ea580c] text-sm font-semibold">
                Registrar ahora{' '}
                <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </div>
            </div>
          </Link>
        ) : isGym ? (
          <Link href="/gym" className="group block">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#ea580c]/40 transition-all p-5 h-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#ea580c]/10 flex items-center justify-center text-2xl shrink-0">
                  🏋️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[#1e3a5f] mb-1">Ir al gym</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Registra pesos, series y PRs. El sistema lleva la progresión por ti
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#ea580c] text-sm font-semibold">
                Empezar sesión{' '}
                <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/log" className="group block">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#ea580c]/40 transition-all p-5 h-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#ea580c]/10 flex items-center justify-center text-2xl shrink-0">
                  🏃
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[#1e3a5f] mb-1">Empieza a entrenar</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Registra tu actividad de hoy: running, gym, o lo que estés haciendo
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#ea580c] text-sm font-semibold">
                Registrar sesión{' '}
                <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </div>
            </div>
          </Link>
        )}

        <Link href="/find-coach" className="group block">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#3b6fdd]/40 transition-all p-5 h-full">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#3b6fdd]/10 flex items-center justify-center text-2xl shrink-0">
                🎯
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-[#1e3a5f] mb-1">Busca un entrenador</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {isRunner
                    ? 'Un coach te diseña un plan periodizado y hace seguimiento de tu rendimiento'
                    : 'Un coach diseña tu rutina personalizada y hace seguimiento semanal'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[#3b6fdd] text-sm font-semibold">
              Ver entrenadores{' '}
              <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </div>
          </div>
        </Link>

      </div>
    </div>
  )
}
