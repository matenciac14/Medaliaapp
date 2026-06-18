'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import MetricSlider from './MetricSlider'
import MetricInput from './MetricInput'
import SessionsPanel, { type WeekSession } from './SessionsPanel'

// ——— Tipos ———
export interface PrevMetrics {
  weightKg: number | null
  hrResting: number | null
  sleepHours: number | null
  energyLevel: number | null
  hardestSessionRpe: number | null
  // sleepScore en DB es 0-100; se convierte a 1-10 antes de pasar como prevSleepScore
  prevSleepScore: number | null
  stressLevel: number | null
  motivationLevel: number | null
  painLevel: number | null
  // nutritionAdherencePct en DB es 0-100; se convierte a 1-10
  prevNutritionAdherence: number | null
}

// Labels legibles para los triggers del motor de ajuste
const TRIGGER_LABELS: Record<string, string> = {
  fc_alta:         '❤️ FC reposo elevada',
  sueno_bajo:      '😴 Sueño insuficiente',
  rpe_excesivo:    '⚡ RPE muy alto para la fase',
  energia_baja:    '🔋 Energía baja',
  dolor_activo:    '🚨 Dolor / molestia reportada',
  estres_alto:     '😰 Estrés elevado',
  motivacion_baja: '💭 Motivación baja',
  adherencia_baja: '📉 Adherencia baja al plan',
  nutricion_baja:  '🥗 Adherencia nutricional baja',
}

export type CheckInState = 'submitted' | 'early' | 'open'

interface LastWeekSummary {
  weightKg: number | null
  sleepHours: number | null
  energyLevel: number | null
  stressLevel: number | null
  motivationLevel: number | null
  adjustmentsTriggered: string[]
  recordedAt: Date
}

interface CheckInClientProps {
  weekSessions: WeekSession[]
  prevMetrics: PrevMetrics
  weekLabel: string
  hasNutrition: boolean
  weekAdherence: { completed: number; total: number }
  checkInState: CheckInState
  submittedAt: Date | null
  submittedTriggers: string[]
  lastWeekSummary: LastWeekSummary | null
}

// ——— Motor de alertas client-side ———
function evaluateAlerts(data: {
  weightKg?: number
  hrResting?: number
  sleepScore?: number
  previousWeightKg?: number | null
  previousHrResting?: number | null
}): string[] {
  const alerts: string[] = []
  if (data.hrResting && data.previousHrResting && data.hrResting > data.previousHrResting * 1.10) {
    alerts.push('FC reposo elevada — considera un día extra de descanso')
  }
  if (data.sleepScore && data.sleepScore < 70) {
    alerts.push('Calidad de sueño baja — priorizá el descanso esta semana')
  }
  if (data.weightKg && data.previousWeightKg && (data.previousWeightKg - data.weightKg) > 1.2) {
    alerts.push('Bajaste más de 1.2 kg esta semana — aumentá 200-300 kcal')
  }
  return alerts
}

export default function CheckInClient({
  weekSessions,
  prevMetrics,
  weekLabel,
  hasNutrition,
  weekAdherence,
  checkInState,
  submittedAt,
  submittedTriggers,
  lastWeekSummary,
}: CheckInClientProps) {
  const router = useRouter()
  // openForm: fuerza el formulario desde estado 'early' o 'submitted'
  const [openForm, setOpenForm] = useState(false)

  // Métricas numéricas
  const [weightKg, setWeightKg] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [hrResting, setHrResting] = useState('')

  // Sliders 1-10
  const [energyLevel, setEnergyLevel] = useState(0)
  const [hardestRpe, setHardestRpe] = useState(0)
  const [sleepQuality, setSleepQuality] = useState(0)   // → sleepScore × 10 en DB
  const [stressLevel, setStressLevel] = useState(0)
  const [motivationLevel, setMotivationLevel] = useState(0)
  const [painLevel, setPainLevel] = useState(0)         // 0 = sin dolor, >= 5 = hasPain true
  const [nutritionAdherence, setNutritionAdherence] = useState(0)

  // Notas
  const [notes, setNotes] = useState('')

  // UI state
  const [alerts, setAlerts] = useState<string[]>([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [adjustment, setAdjustment] = useState<{
    severity: 'ok' | 'warning' | 'critical'
    recommendation: string
    adjustments: string[]
  } | null>(null)

  function buildBody() {
    return {
      weightKg: weightKg ? Number(weightKg) : undefined,
      hrResting: hrResting ? Number(hrResting) : undefined,
      sleepHours: sleepHours ? Number(sleepHours) : undefined,
      // Slider 1-10 → guardado como 0-100 para consistencia con wearables
      sleepScore: sleepQuality > 0 ? sleepQuality * 10 : undefined,
      hardestRpe: hardestRpe || 5,
      // painLevel 1-10: el servidor deriva hasPain = painLevel >= 5
      painLevel: painLevel > 0 ? painLevel : undefined,
      energyLevel: energyLevel || 5,
      stressLevel: stressLevel || undefined,
      motivationLevel: motivationLevel || undefined,
      nutritionAdherencePct: hasNutrition && nutritionAdherence > 0 ? nutritionAdherence * 10 : undefined,
      notes: notes || undefined,
    }
  }

  function handleSubmit() {
    if (!energyLevel || !hardestRpe) {
      setFormError('Completa al menos la energía percibida y el RPE de la sesión más dura.')
      return
    }
    setFormError(null)
    const body = buildBody()
    const found = evaluateAlerts({
      weightKg: body.weightKg,
      hrResting: body.hrResting,
      sleepScore: body.sleepScore,
      previousWeightKg: prevMetrics.weightKg,
      previousHrResting: prevMetrics.hrResting,
    })
    if (found.length > 0) {
      setAlerts(found)
      setShowAlertModal(true)
    } else {
      doSave(body)
    }
  }

  async function doSave(body: ReturnType<typeof buildBody>) {
    setSaving(true)
    setSaveError(null)
    setShowAlertModal(false)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err?.error ?? `Error ${res.status} — intenta de nuevo`)
      }
      const json = await res.json() as { adjustment?: { severity: 'ok' | 'warning' | 'critical'; recommendation: string; adjustments: string[] } }
      if (json.adjustment) setAdjustment(json.adjustment)
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el check-in. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // ——— Helper: próximo viernes ———
  function getNextFriday() {
    const now = new Date()
    const day = now.getDay()
    const daysUntil = day <= 5 ? 5 - day : 6 // 5=Viernes
    const next = new Date(now)
    next.setDate(now.getDate() + (daysUntil === 0 && day === 5 ? 7 : daysUntil))
    return next.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // ——— Helper: próximo viernes tras envío ———
  function getNextFridayAfterSubmit() {
    const now = new Date()
    const day = now.getDay()
    const daysUntil = ((5 - day + 7) % 7) || 7
    const next = new Date(now)
    next.setDate(now.getDate() + daysUntil)
    return next.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // ——— Estado: ya enviaste esta semana ———
  if (checkInState === 'submitted' && !openForm && !saved) {
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
            <button onClick={() => router.push('/dashboard')} className="w-full bg-[#f97316] hover:opacity-90 text-white font-bold py-4 rounded-2xl text-base transition-opacity">
              Volver al dashboard
            </button>
            <button onClick={() => setOpenForm(true)} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
              Actualizar datos de esta semana
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ——— Estado: temprano en la semana (Lun-Jue), aún no envió ———
  if (checkInState === 'early' && !openForm && !saved) {
    const nextFriday = getNextFriday()
    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 pt-10">
        <div className="w-full max-w-md space-y-4">
          {/* Banner orientador */}
          <div className="bg-[#1e3a5f] rounded-2xl p-5 text-white space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.6)]">Check-in semanal</p>
            <p className="text-[15px] font-bold">Se activa el viernes</p>
            <p className="text-[13px] text-[rgba(255,255,255,0.75)]">
              Espera al final de la semana para tener datos completos. Tu próximo check-in es el <span className="font-semibold text-white">{nextFriday}</span>.
            </p>
          </div>

          {/* Resumen semana pasada */}
          {lastWeekSummary ? (
            <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] p-5 space-y-3">
              <h3 className="text-[13px] font-semibold text-[#0f1e30]">Semana pasada</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Peso corporal', value: lastWeekSummary.weightKg != null     ? `${lastWeekSummary.weightKg} kg`     : null },
                  { label: 'Horas de sueño', value: lastWeekSummary.sleepHours != null  ? `${lastWeekSummary.sleepHours} h`    : null },
                  { label: 'Energía',        value: lastWeekSummary.energyLevel != null ? `${lastWeekSummary.energyLevel}/10`  : null },
                  { label: 'Estrés',         value: lastWeekSummary.stressLevel != null ? `${lastWeekSummary.stressLevel}/10`  : null },
                  { label: 'Motivación',     value: lastWeekSummary.motivationLevel != null ? `${lastWeekSummary.motivationLevel}/10` : null },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="flex justify-between text-[13px]">
                    <span className="text-[#4d4d4d]">{r.label}</span>
                    <span className="font-semibold text-[#0f1e30]">{r.value}</span>
                  </div>
                ))}
              </div>

              {lastWeekSummary.adjustmentsTriggered.length > 0 && (
                <div className="border-t border-gray-100 pt-3 space-y-1">
                  <p className="text-[11px] font-semibold text-[#808080] uppercase tracking-wide">Ajustes aplicados</p>
                  {lastWeekSummary.adjustmentsTriggered.map(t => (
                    <p key={t} className="text-[12px] text-[#4d4d4d]">{TRIGGER_LABELS[t] ?? t}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] p-5 text-center">
              <p className="text-[13px] text-[#808080]">Sin datos de la semana pasada aún.</p>
            </div>
          )}

          <div className="space-y-2 pb-8">
            <button onClick={() => router.push('/dashboard')} className="w-full bg-[#f97316] hover:opacity-90 text-white font-bold py-4 rounded-2xl text-base transition-opacity">
              Volver al dashboard
            </button>
            <button onClick={() => setOpenForm(true)} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
              Abrir check-in de todas formas
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ——— Pantalla de confirmación ———
  if (saved) {
    const bannerStyles = {
      ok: { wrapper: 'bg-green-50 border border-green-200', title: 'text-green-800', text: 'text-green-700', icon: '✅', label: '¡Semana perfecta!' },
      warning: { wrapper: 'bg-yellow-50 border border-yellow-200', title: 'text-yellow-800', text: 'text-yellow-700', icon: '⚠️', label: 'Ajuste recomendado' },
      critical: { wrapper: 'bg-red-50 border border-red-200', title: 'text-red-800', text: 'text-red-700', icon: '🚨', label: 'Atención requerida' },
    }
    const severity = adjustment?.severity ?? 'ok'
    const style = bannerStyles[severity]
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-gray-900">Check-in guardado</h2>
          <p className="text-sm text-gray-500">Tu plan de la próxima semana ya fue ajustado.</p>
          {adjustment && (
            <div className={`rounded-xl p-4 text-left space-y-1 ${style.wrapper}`}>
              <p className={`text-sm font-bold flex items-center gap-2 ${style.title}`}>
                <span>{style.icon}</span>
                {style.label}
              </p>
              <p className={`text-sm ${style.text}`}>{adjustment.recommendation}</p>
            </div>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  // ——— Adherencia visual ———
  const adherencePct = weekAdherence.total > 0
    ? Math.round((weekAdherence.completed / weekAdherence.total) * 100)
    : null

  // Color de la barra de dolor: verde si bajo, rojo si alto
  const painColor = painLevel >= 7 ? '#ef4444' : painLevel >= 4 ? '#f97316' : '#22c55e'

  // ——— Form principal ———
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-8">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#0f1e30]">Check-in Semanal</h1>
          <p className="text-sm text-gray-400 mt-0.5">{weekLabel} · Cuéntanos cómo te fue</p>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-5 space-y-5 lg:space-y-0">

          {/* ——— Columna izquierda ——— */}
          <div className="space-y-5">

            {/* Métricas de la semana */}
            <section className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">📊 Métricas de la semana</h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                <MetricInput
                  label="Peso corporal"
                  value={weightKg}
                  onChange={setWeightKg}
                  unit="kg"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="ej. 70.5"
                  prevValue={prevMetrics.weightKg}
                />
                <MetricInput
                  label="Horas de sueño (prom.)"
                  value={sleepHours}
                  onChange={setSleepHours}
                  unit="h"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="ej. 7.5"
                  prevValue={prevMetrics.sleepHours}
                />

                {/* FC reposo */}
                <MetricInput
                  label="FC reposo"
                  value={hrResting}
                  onChange={setHrResting}
                  unit="bpm"
                  placeholder="ej. 58"
                  prevValue={prevMetrics.hrResting}
                  invertDelta
                />

                {/* Energía percibida */}
                <MetricSlider
                  label="Energía percibida"
                  value={energyLevel}
                  onChange={setEnergyLevel}
                  color="#f97316"
                  lowLabel="Sin energía"
                  highLabel="Al 100%"
                  prevValue={prevMetrics.energyLevel}
                />

                {/* RPE sesión más dura */}
                <MetricSlider
                  label="RPE sesión más dura"
                  value={hardestRpe}
                  onChange={setHardestRpe}
                  color="#ef4444"
                  lowLabel="Fácil"
                  highLabel="Al límite"
                  prevValue={prevMetrics.hardestSessionRpe}
                />
              </div>
            </section>

            {/* Bienestar general */}
            <section className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">😴 Bienestar general</h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                <MetricSlider
                  label="Calidad del sueño"
                  value={sleepQuality}
                  onChange={setSleepQuality}
                  color="#1a9933"
                  lowLabel="Muy mal"
                  highLabel="Excelente"
                  prevValue={prevMetrics.prevSleepScore}
                />
                <MetricSlider
                  label="Nivel de estrés"
                  value={stressLevel}
                  onChange={setStressLevel}
                  color="#c33"
                  lowLabel="Sin estrés"
                  highLabel="Muy estresado"
                  prevValue={prevMetrics.stressLevel}
                />
                <MetricSlider
                  label="Motivación"
                  value={motivationLevel}
                  onChange={setMotivationLevel}
                  color="#1a9933"
                  lowLabel="Sin motivación"
                  highLabel="Muy motivado"
                  prevValue={prevMetrics.motivationLevel}
                />
                {/* Dolor / molestias — slider 1-10, rojo cuando alto */}
                <MetricSlider
                  label="Dolor / molestias"
                  value={painLevel}
                  onChange={setPainLevel}
                  color={painColor}
                  lowLabel="Sin dolor"
                  highLabel="Dolor intenso"
                  prevValue={prevMetrics.painLevel}
                />

                {/* Nutrición — solo si feature activa */}
                {hasNutrition && (
                  <MetricSlider
                    label="Adherencia al plan de comida"
                    value={nutritionAdherence}
                    onChange={setNutritionAdherence}
                    color="#14b8a6"
                    lowLabel="No lo seguí"
                    highLabel="Al 100%"
                    prevValue={prevMetrics.prevNutritionAdherence}
                  />
                )}
              </div>
            </section>

            {/* Notas de la semana — mobile */}
            <section className="lg:hidden bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">Notas de la semana</h2>
              </div>
              <div className="px-6 py-5">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Las series del fartlek me costaron más de lo esperado..."
                  rows={3}
                  className="w-full text-sm bg-[#f7f7f7] rounded-[8px] px-3 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 text-[#4d4d4d] placeholder:text-[#808080]"
                />
              </div>
            </section>

            {/* CTA mobile */}
            <div className="lg:hidden space-y-3">
              {formError && (
                <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{formError}</p>
              )}
              {saveError && (
                <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{saveError}</p>
              )}
              <p className="text-xs text-center text-gray-400">
                Estos datos ajustarán tu plan de la próxima semana automáticamente.
              </p>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-[#f97316] hover:opacity-90 active:opacity-80 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-opacity shadow-md"
              >
                {saving ? 'Guardando...' : 'Enviar check-in'}
              </button>
            </div>
          </div>

          {/* ——— Columna derecha (sticky desktop) ——— */}
          <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">

            {/* Sesiones completadas con adherencia integrada */}
            <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">✅ Sesiones completadas</h2>
                {adherencePct !== null && (
                  <span className="text-sm font-bold text-[#1e3a5f]">
                    {weekAdherence.completed}/{weekAdherence.total}
                  </span>
                )}
              </div>
              {adherencePct !== null && (
                <div className="px-6 pt-4 pb-2">
                  <div className="h-[6px] bg-[#e6e6e6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${adherencePct}%`,
                        backgroundColor: adherencePct >= 80 ? '#1a9933' : adherencePct >= 50 ? '#f97316' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              )}
              <SessionsPanel sessions={weekSessions} showHeader={false} />
            </div>

            {/* Notas de la semana */}
            <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">📝 Notas de la semana</h2>
              </div>
              <div className="px-6 py-5">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Las series del fartlek me costaron más de lo esperado..."
                  rows={3}
                  className="w-full text-sm bg-[#f7f7f7] rounded-[8px] px-3 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 text-[#4d4d4d] placeholder:text-[#808080]"
                />
              </div>
            </div>

            {/* CTA */}
            {(formError || saveError) && (
              <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">
                {formError ?? saveError}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-[#f97316] hover:opacity-90 active:opacity-80 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-opacity shadow-md"
            >
              {saving ? 'Guardando...' : 'Enviar check-in'}
            </button>
          </div>
        </div>
      </div>

      {/* ——— Modal de alertas ——— */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-yellow-50 border-b border-yellow-200 px-5 py-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-yellow-800">Atenciones detectadas</p>
                <p className="text-xs text-yellow-700 mt-0.5">Revisá estos puntos antes de guardar</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-yellow-50 rounded-xl px-3 py-2.5">
                  <span className="text-base shrink-0">⚠️</span>
                  <p className="text-sm text-yellow-900">{alert}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAlertModal(false)}
                className="py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Revisar datos
              </button>
              <button
                onClick={() => doSave(buildBody())}
                disabled={saving}
                className="py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Entendido, guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
