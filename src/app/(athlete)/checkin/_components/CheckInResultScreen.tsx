const TRIGGER_LABELS: Record<string, string> = {
  fc_alta:             'FC reposo elevada',
  sueno_bajo:          'Sueño insuficiente',
  rpe_excesivo:        'RPE alto en fase BASE',
  dolor_activo:        'Dolor / molestias activas',
  energia_baja:        'Energía baja',
  estres_alto:         'Estrés elevado',
  motivacion_baja:     'Motivación muy baja',
  nutricion_baja:      'Adherencia nutricional baja',
  perdida_peso_rapida: 'Pérdida de peso acelerada',
  fatiga_acumulada:    'Fatiga acumulada (múltiples señales)',
}

type Props = {
  weekLabel: string
  triggers: string[]
  adjustments: string[]
  severity: 'ok' | 'warning' | 'critical'
  onBack: () => void
}

const SEVERITY_STYLES = {
  ok:       { banner: 'bg-green-50 border-green-200',   icon: '✅', text: 'text-green-800' },
  warning:  { banner: 'bg-amber-50 border-amber-200',   icon: '⚠️', text: 'text-amber-800' },
  critical: { banner: 'bg-red-50 border-red-200',       icon: '🚨', text: 'text-red-800'   },
}

export default function CheckInResultScreen({ weekLabel, triggers, adjustments, severity, onBack }: Props) {
  const s = SEVERITY_STYLES[severity]
  const hasIssues = triggers.length > 0
  const detectedLabels = triggers
    .filter(t => t !== 'fatiga_acumulada')
    .map(t => TRIGGER_LABELS[t] ?? t)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 max-w-sm w-full space-y-5">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-5xl mb-2">{s.icon}</div>
          <h2 className="text-xl font-bold text-gray-900">Check-in guardado</h2>
          <p className="text-sm text-gray-400">{weekLabel}</p>
        </div>

        {!hasIssues ? (
          /* Sin ajustes — todo bien */
          <div className={`rounded-xl border p-4 text-center ${s.banner}`}>
            <p className={`text-sm font-semibold ${s.text}`}>Todo en orden</p>
            <p className="text-sm text-gray-600 mt-1">Sigue el plan como está — tus métricas están en rango óptimo.</p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Lo que detectamos */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Lo que detectamos
              </p>
              <ul className="space-y-1.5">
                {detectedLabels.map((label, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 mt-0.5 shrink-0">·</span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Lo que ajustamos */}
            {adjustments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Lo que ajustamos en tu plan
                </p>
                <ul className="space-y-2">
                  {adjustments.map((adj, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 border ${s.banner}`}>
                      <span className={`mt-0.5 shrink-0 ${s.text}`}>→</span>
                      <span className={s.text}>{adj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        )}

        {/* CTA */}
        <button
          onClick={onBack}
          className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Volver al dashboard
        </button>

      </div>
    </div>
  )
}
