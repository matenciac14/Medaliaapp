'use client'

import type { PrevMetrics, LastWeekSummary } from './checkin.types'
import { TRIGGER_LABELS } from './checkin.types'

interface Props {
  prevMetrics: PrevMetrics
  weekLabel: string
  submittedAt: Date | null
  submittedTriggers: string[]
  lastWeekSummary: LastWeekSummary | null
  onUpdate: () => void
  onBack: () => void
}

function getNextFridayAfterSubmit(): string {
  const now = new Date()
  const day = now.getDay()
  const daysUntil = ((5 - day + 7) % 7) || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntil)
  return next.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function SubmittedCheckInView({
  prevMetrics,
  weekLabel,
  submittedAt,
  submittedTriggers,
  lastWeekSummary,
  onUpdate,
  onBack,
}: Props) {
  const submittedDateStr = submittedAt
    ? new Date(submittedAt).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null
  const hasAdjustments = submittedTriggers.length > 0

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 pt-10">
      <div className="w-full max-w-md space-y-4">
        <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] p-6 text-center space-y-2">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold text-[#0f1e30]">Check-in enviado</h2>
          <p className="text-sm text-[#808080]">{weekLabel}</p>
          {submittedDateStr && <p className="text-xs text-gray-400">Enviado el {submittedDateStr}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] p-5 space-y-3">
          <h3 className="text-[13px] font-semibold text-[#0f1e30]">Lo que reportaste</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Peso corporal',    value: prevMetrics.weightKg != null    ? `${prevMetrics.weightKg} kg`       : null },
              { label: 'Horas de sueño',   value: prevMetrics.sleepHours != null  ? `${prevMetrics.sleepHours} h`      : null },
              { label: 'Energía',          value: prevMetrics.energyLevel != null ? `${prevMetrics.energyLevel}/10`    : null },
              { label: 'Estrés',           value: prevMetrics.stressLevel != null ? `${prevMetrics.stressLevel}/10`    : null },
              { label: 'Motivación',       value: prevMetrics.motivationLevel != null ? `${prevMetrics.motivationLevel}/10` : null },
            ].filter(r => r.value).map(r => (
              <div key={r.label} className="flex justify-between text-[13px]">
                <span className="text-[#4d4d4d]">{r.label}</span>
                <span className="font-semibold text-[#0f1e30]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {lastWeekSummary && lastWeekSummary.adjustmentsTriggered.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] p-5 space-y-3">
            <h3 className="text-[13px] font-semibold text-[#0f1e30]">Semana pasada</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Peso corporal', value: lastWeekSummary.weightKg != null     ? `${lastWeekSummary.weightKg} kg`     : null },
                { label: 'Horas de sueño', value: lastWeekSummary.sleepHours != null  ? `${lastWeekSummary.sleepHours} h`    : null },
                { label: 'Energía',        value: lastWeekSummary.energyLevel != null ? `${lastWeekSummary.energyLevel}/10`  : null },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="flex justify-between text-[13px]">
                  <span className="text-[#4d4d4d]">{r.label}</span>
                  <span className="font-semibold text-[#0f1e30]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasAdjustments ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-2">
            <h3 className="text-[13px] font-semibold text-yellow-800">⚙️ Ajustes aplicados al plan</h3>
            <ul className="space-y-1">
              {submittedTriggers.map(t => (
                <li key={t} className="text-[13px] text-yellow-700">{TRIGGER_LABELS[t] ?? t}</li>
              ))}
            </ul>
            <p className="text-[11px] text-yellow-600">Las sesiones de la semana siguiente fueron ajustadas.</p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="text-[13px] text-green-700 font-medium">✅ Métricas en rango óptimo — sin ajustes necesarios.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] p-5 text-center space-y-1">
          <p className="text-[11px] text-[#808080] uppercase tracking-wide font-semibold">Próximo check-in</p>
          <p className="text-[15px] font-bold text-[#0f1e30]">{getNextFridayAfterSubmit()}</p>
        </div>

        <div className="space-y-2 pb-8">
          <button onClick={onBack} className="w-full bg-[#ea580c] hover:opacity-90 text-white font-bold py-4 rounded-2xl text-base transition-opacity">
            Volver al dashboard
          </button>
          <button onClick={onUpdate} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
            Actualizar datos de esta semana
          </button>
        </div>
      </div>
    </div>
  )
}
