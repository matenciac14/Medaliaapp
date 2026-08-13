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
  planName, totalWeeks, sessionsLogged, sessionsTotal, isB2B,
}: Props) {
  const adherencePct = sessionsTotal > 0
    ? Math.round((sessionsLogged / sessionsTotal) * 100)
    : 0

  return (
    <div className="bg-green-50 rounded-2xl border border-green-100 p-8 text-center space-y-5">
      <div className="text-5xl">🏆</div>

      <div>
        <h2 className="text-2xl font-black text-[#1e3a5f]">
          ¡Plan completado!
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {planName} · {totalWeeks} semanas
        </p>
      </div>

      <div className="flex items-center justify-center gap-10">
        <div className="text-center">
          <p className="text-2xl font-black text-[#1e3a5f]">{totalWeeks}</p>
          <p className="text-xs text-gray-500 mt-0.5">semanas</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-[#1e3a5f]">{sessionsLogged}</p>
          <p className="text-xs text-gray-500 mt-0.5">sesiones</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-black ${adherencePct >= 80 ? 'text-green-600' : adherencePct >= 60 ? 'text-[#ea580c]' : 'text-red-500'}`}>
            {adherencePct}%
          </p>
          <p className="text-xs text-gray-500 mt-0.5">adherencia</p>
        </div>
      </div>

      {/* CTA — differs by B2B/B2C */}
      <div className="pt-2 space-y-3 max-w-sm mx-auto">
        {isB2B ? (
          <div className="bg-white/70 rounded-xl px-5 py-4">
            <p className="text-sm font-semibold text-[#1e3a5f]">Tu coach asignará el próximo plan</p>
            <p className="text-xs text-gray-400 mt-1">Recibirás una notificación cuando tu entrenador lo tenga listo.</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-[#1e3a5f]">¿Listo para el siguiente desafío?</p>
            <Link
              href="/find-coach"
              className="block w-full text-center bg-[#1e3a5f] hover:bg-[#243f6a] text-white text-sm font-bold px-5 py-3 rounded-xl transition-colors"
            >
              Buscar entrenador →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
