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

type PlanChanges = {
  volumeDeltaPct?: number
  zonesAdjusted?: boolean
}

type NutritionChanges = {
  newKcalHard?: number
  newKcalEasy?: number
}

type Props = {
  weekLabel: string
  triggers: string[]
  adjustments: string[]
  severity: 'ok' | 'warning' | 'critical'
  suggestions?: CheckInSuggestion[]
  planChanges?: PlanChanges
  nutritionChanges?: NutritionChanges
  onBack: () => void
}

const SEVERITY_CONFIG = {
  ok:       { headerBg: 'from-green-600 to-green-700',  icon: '🎯', badge: 'bg-green-100 text-green-800', adjBorder: 'border-l-green-500', adjBg: 'bg-green-50' },
  warning:  { headerBg: 'from-amber-500 to-orange-600', icon: '⚡', badge: 'bg-amber-100 text-amber-800', adjBorder: 'border-l-amber-500', adjBg: 'bg-amber-50' },
  critical: { headerBg: 'from-red-600 to-red-700',      icon: '🚨', badge: 'bg-red-100 text-red-800',    adjBorder: 'border-l-red-500',   adjBg: 'bg-red-50'   },
}

export default function CheckInResultScreen({ weekLabel, triggers, adjustments, severity, suggestions = [], planChanges, nutritionChanges, onBack }: Props) {
  const cfg = SEVERITY_CONFIG[severity]
  const hasIssues = triggers.length > 0
  const detectedLabels = triggers
    .filter(t => t !== 'fatiga_acumulada')
    .map(t => TRIGGER_LABELS[t] ?? t)

  const hasFatiga = triggers.includes('fatiga_acumulada')
  const hasNumericChanges = planChanges?.volumeDeltaPct !== undefined || planChanges?.zonesAdjusted || nutritionChanges?.newKcalHard !== undefined

  const [respondedIds, setRespondedIds] = useState<Record<string, 'accepted' | 'rejected'>>({})
  const [responding, setResponding] = useState<string | null>(null)

  async function respond(id: string, action: 'accept' | 'reject') {
    setResponding(id)
    try {
      await fetch(`/api/athlete/checkin/suggestions/${id}/${action}`, { method: 'POST' })
      setRespondedIds(prev => ({ ...prev, [id]: action === 'accept' ? 'accepted' : 'rejected' }))
    } finally {
      setResponding(null)
    }
  }

  const pendingSuggestions = suggestions.filter(s => !respondedIds[s.id])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-md w-full">

        {/* Header con gradiente */}
        <div className={`bg-gradient-to-br ${cfg.headerBg} px-6 pt-8 pb-6 text-white text-center`}>
          <div className="text-5xl mb-3">{cfg.icon}</div>
          <h2 className="text-xl font-black tracking-tight">
            {!hasIssues ? '¡Todo en orden!' : hasFatiga ? 'Fatiga detectada' : 'Plan ajustado'}
          </h2>
          <p className="text-white/70 text-sm mt-1">{weekLabel}</p>
          {!hasIssues && (
            <p className="text-white/85 text-sm mt-3 leading-relaxed max-w-xs mx-auto">
              Tus métricas están en rango óptimo. Sigue el plan como está.
            </p>
          )}
        </div>

        <div className="p-6 space-y-5">

          {hasIssues && (
            <>
              {/* Lo que detectamos — pills */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Lo que detectamos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detectedLabels.map((label, i) => (
                    <span key={i} className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                      {label}
                    </span>
                  ))}
                  {hasFatiga && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                      Fatiga acumulada
                    </span>
                  )}
                </div>
              </div>

              {/* Lo que ajustamos — cards con borde izquierdo */}
              {adjustments.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                    Lo que ajustamos en tu plan
                  </p>
                  <ul className="space-y-2">
                    {adjustments.map((adj, i) => (
                      <li key={i} className={`flex items-start gap-3 text-sm rounded-lg px-3 py-2.5 border-l-4 ${cfg.adjBorder} ${cfg.adjBg}`}>
                        <span className="text-gray-400 mt-0.5 shrink-0 font-mono text-xs">→</span>
                        <span className="text-gray-800 leading-snug">{adj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Valores numéricos aplicados */}
          {hasNumericChanges && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                El sistema actualizó
              </p>
              <div className="grid grid-cols-1 gap-2">
                {planChanges?.volumeDeltaPct !== undefined && (
                  <div className="flex items-center justify-between bg-[#1e3a5f]/5 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">📊</span>
                      <span className="text-sm text-gray-700 font-medium">Volumen próxima semana</span>
                    </div>
                    <span className={`text-base font-black ${planChanges.volumeDeltaPct < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {planChanges.volumeDeltaPct > 0 ? '+' : ''}{planChanges.volumeDeltaPct}%
                    </span>
                  </div>
                )}
                {nutritionChanges?.newKcalHard !== undefined && (
                  <div className="flex items-center justify-between bg-[#1e3a5f]/5 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🔥</span>
                      <span className="text-sm text-gray-700 font-medium">Kcal día intenso</span>
                    </div>
                    <span className="text-base font-black text-[#1e3a5f]">{Math.round(nutritionChanges.newKcalHard)}</span>
                  </div>
                )}
                {nutritionChanges?.newKcalEasy !== undefined && (
                  <div className="flex items-center justify-between bg-[#1e3a5f]/5 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🌿</span>
                      <span className="text-sm text-gray-700 font-medium">Kcal día suave / descanso</span>
                    </div>
                    <span className="text-base font-black text-[#1e3a5f]">{Math.round(nutritionChanges.newKcalEasy)}</span>
                  </div>
                )}
                {planChanges?.zonesAdjusted && (
                  <div className="flex items-center justify-between bg-[#1e3a5f]/5 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🎯</span>
                      <span className="text-sm text-gray-700 font-medium">Intensidad de sesiones</span>
                    </div>
                    <span className="text-base font-black text-amber-600">Reducida</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sugerencias del coach (plan COACH) */}
          {pendingSuggestions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                Sugerencias de tu coach
              </p>
              <div className="space-y-3">
                {pendingSuggestions.map(suggestion => {
                  const responded = respondedIds[suggestion.id]
                  return (
                    <div key={suggestion.id} className="rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/4 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-bold text-[#1e3a5f]">{suggestion.title}</p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{suggestion.description}</p>
                      </div>
                      {responded ? (
                        <p className={`text-xs text-center font-semibold py-1.5 rounded-lg ${responded === 'accepted' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {responded === 'accepted' ? '✓ Aceptado — plan actualizado' : '✗ Rechazado'}
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
            </div>
          )}

          {/* CTA */}
          <button
            onClick={onBack}
            className="w-full bg-[#ea580c] hover:bg-[#c84e0b] text-white font-bold py-3.5 rounded-xl transition-colors text-sm tracking-wide"
          >
            Volver al dashboard →
          </button>

        </div>
      </div>
    </div>
  )
}
