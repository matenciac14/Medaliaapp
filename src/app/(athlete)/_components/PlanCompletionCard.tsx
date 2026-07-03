import Link from 'next/link'

type Props = {
  planName: string
  totalWeeks: number
  sessionsLogged: number
  sessionsTotal: number
  recoveryDaysSinceEnd: number
  isB2B: boolean
}

export default function PlanCompletionCard({
  planName, totalWeeks, sessionsLogged, sessionsTotal, recoveryDaysSinceEnd, isB2B,
}: Props) {
  const adherencePct = sessionsTotal > 0
    ? Math.round((sessionsLogged / sessionsTotal) * 100)
    : 0

  const isFreshCompletion = recoveryDaysSinceEnd <= 2

  return (
    <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] rounded-2xl p-6 text-white overflow-hidden relative">
      {/* Decorativo */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8 pointer-events-none" />

      {/* Badge estado */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white">
          {isFreshCompletion ? '🏆 ¡Plan completado!' : `Recuperación · día ${recoveryDaysSinceEnd + 1}/14`}
        </span>
      </div>

      {/* Nombre del plan */}
      <h2 className="text-xl font-black leading-tight mb-4">{planName}</h2>

      {/* Stats en fila */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-black leading-none">{totalWeeks}</p>
          <p className="text-[10px] text-white/70 mt-1 uppercase tracking-wide">semanas</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-black leading-none">{sessionsLogged}</p>
          <p className="text-[10px] text-white/70 mt-1 uppercase tracking-wide">sesiones</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <p className={`text-2xl font-black leading-none ${adherencePct >= 80 ? 'text-green-300' : adherencePct >= 60 ? 'text-yellow-300' : 'text-red-300'}`}>
            {adherencePct}%
          </p>
          <p className="text-[10px] text-white/70 mt-1 uppercase tracking-wide">adherencia</p>
        </div>
      </div>

      {/* Mensaje motivacional */}
      {isFreshCompletion && (
        <p className="text-sm text-white/80 leading-relaxed mb-5">
          {adherencePct >= 80
            ? 'Terminaste fuerte. Un descanso activo esta semana y estarás listo para el siguiente ciclo.'
            : 'Terminaste el plan. La consistencia se construye ciclo a ciclo — el siguiente será mejor.'}
        </p>
      )}

      {/* CTAs */}
      <div className="flex gap-2">
        {isB2B ? (
          <div className="flex-1 text-center bg-white/10 rounded-xl px-3 py-2.5">
            <p className="text-xs text-white/70">Tu coach preparará tu siguiente plan</p>
          </div>
        ) : (
          <Link
            href="/coaches"
            className="flex-1 text-center bg-[#f97316] hover:bg-[#ea6c0b] transition-colors rounded-xl px-3 py-2.5"
          >
            <p className="text-sm font-bold">Buscar entrenador</p>
          </Link>
        )}
        <Link
          href="/log"
          className="flex-1 text-center bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-3 py-2.5"
        >
          <p className="text-sm font-semibold">Seguir entrenando</p>
        </Link>
      </div>
    </div>
  )
}
