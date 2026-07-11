'use client'

import { useState } from 'react'

const TRIGGER_LABELS: Record<string, string> = {
  fc_alta:                  'FC reposo elevada',
  sueno_bajo:               'Sueño insuficiente',
  rpe_excesivo:             'RPE alto en fase BASE',
  dolor_activo:             'Dolor / molestias activas',
  energia_baja:             'Energía baja',
  estres_alto:              'Estrés elevado',
  motivacion_baja:          'Motivación muy baja',
  nutricion_baja:           'Adherencia nutricional baja',
  nutricion_deficit_critico:'Déficit nutricional crítico',
  perdida_peso_rapida:      'Pérdida de peso acelerada',
  fatiga_acumulada:         'Fatiga acumulada (múltiples señales)',
  gym_sobrecarga:           'Sobrecarga en gym',
}

export type CheckInSuggestion = {
  id: string
  type: string
  title: string
  description: string
  expiresAt: string | Date
}

type Props = {
  weekLabel: string
  triggers: string[]
  adjustments: string[]
  severity: 'ok' | 'warning' | 'critical'
  suggestions?: CheckInSuggestion[]
  onBack: () => void
}

const SEVERITY_STYLES = {
  ok:       { banner: 'bg-green-50 border-green-200',   icon: '✅', text: 'text-green-800' },
  warning:  { banner: 'bg-amber-50 border-amber-200',   icon: '⚠️', text: 'text-amber-800' },
  critical: { banner: 'bg-red-50 border-red-200',       icon: '🚨', text: 'text-red-800'   },
}

export default function CheckInResultScreen({ weekLabel, triggers, adjustments, severity, suggestions = [], onBack }: Props) {
  const s = SEVERITY_STYLES[severity]
  const hasIssues = triggers.length > 0
  const detectedLabels = triggers
    .filter(t => t !== 'fatiga_acumulada')
    .map(t => TRIGGER_LABELS[t] ?? t)

  const [respondedIds, setRespondedIds] = useState<Record<string, 'accepted' | 'rejected'>>({})
  const [responding, setResponding] = useState<string | null>(null)

  async function respond(id: string, action: 'accept' | 'reject') {
    setResponding(id)
    try {
      await fetch(`/api/checkin/suggestions/${id}/${action}`, { method: 'POST' })
      setRespondedIds(prev => ({ ...prev, [id]: action === 'accept' ? 'accepted' : 'rejected' }))
    } finally {
      setResponding(null)
    }
  }

  const pendingSuggestions = suggestions.filter(s => !respondedIds[s.id])

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

        {/* Sugerencias del coach (plan COACH) */}
        {pendingSuggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Sugerencias para tu plan
            </p>
            {pendingSuggestions.map(suggestion => {
              const responded = respondedIds[suggestion.id]
              return (
                <div key={suggestion.id} className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">{suggestion.title}</p>
                    <p className="text-xs text-blue-700 mt-1">{suggestion.description}</p>
                  </div>
                  {responded ? (
                    <p className="text-xs text-center font-medium text-gray-500">
                      {responded === 'accepted' ? '✓ Aceptado' : '✗ Rechazado'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => respond(suggestion.id, 'reject')}
                        disabled={responding === suggestion.id}
                        className="py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => respond(suggestion.id, 'accept')}
                        disabled={responding === suggestion.id}
                        className="py-2 text-xs font-semibold rounded-lg bg-[#1e3a5f] text-white hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
                      >
                        {responding === suggestion.id ? '...' : 'Aceptar'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
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
