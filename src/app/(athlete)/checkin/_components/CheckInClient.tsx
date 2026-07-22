'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import MetricSlider from './MetricSlider'
import MetricInput from './MetricInput'
import SessionsPanel, { type WeekSession } from './SessionsPanel'
import SubmittedCheckInView from './SubmittedCheckInView'
import EarlyCheckInScreen from './EarlyCheckInScreen'
import CheckInResultScreen, { type CheckInSuggestion } from './CheckInResultScreen'
import type { PrevMetrics, LastWeekSummary, CheckInState } from './checkin.types'

export type { PrevMetrics, CheckInState }

interface CheckInClientProps {
  weekSessions: WeekSession[]
  prevMetrics: PrevMetrics
  weekLabel: string
  hasNutrition: boolean
  hasGym: boolean
  weekAdherence: { completed: number; total: number }
  checkInState: CheckInState
  submittedAt: Date | null
  submittedTriggers: string[]
  lastWeekSummary: LastWeekSummary | null
  initialSuggestions?: CheckInSuggestion[]
}

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
  hasGym,
  weekAdherence,
  checkInState,
  submittedAt,
  submittedTriggers,
  lastWeekSummary,
  initialSuggestions = [],
}: CheckInClientProps) {
  const router = useRouter()
  const [openForm, setOpenForm] = useState(false)

  const [weightKg, setWeightKg] = useState(prevMetrics.weightKg?.toString() ?? '')
  const [sleepHours, setSleepHours] = useState(prevMetrics.sleepHours?.toString() ?? '')
  const [hrResting, setHrResting] = useState(prevMetrics.hrResting?.toString() ?? '')
  const [energyLevel, setEnergyLevel] = useState(0)
  const [hardestRpe, setHardestRpe] = useState(0)
  const [sleepQuality, setSleepQuality] = useState(0)
  const [stressLevel, setStressLevel] = useState(0)
  const [motivationLevel, setMotivationLevel] = useState(0)
  const [painLevel, setPainLevel] = useState(0)
  const [nutritionAdherence, setNutritionAdherence] = useState(0)
  const [notes, setNotes] = useState('')

  // Body measurements
  const [waistCm, setWaistCm] = useState('')
  const [armsCm, setArmsCm] = useState('')
  const [hipsCm, setHipsCm] = useState('')
  const [thighsCm, setThighsCm] = useState('')

  const [showWellness, setShowWellness] = useState(false)
  const [showMeasurements, setShowMeasurements] = useState(false)

  const [alerts, setAlerts] = useState<string[]>([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [gymRpe, setGymRpe] = useState(0)

  const [adjustment, setAdjustment] = useState<{
    severity: 'ok' | 'warning' | 'critical'
    planChanges?: { volumeDeltaPct?: number; zonesAdjusted?: boolean }
    nutritionChanges?: { newKcalHard?: number; newKcalEasy?: number }
    recommendation: string
    adjustments: string[]
    triggers: string[]
  } | null>(null)
  const [suggestions, setSuggestions] = useState<CheckInSuggestion[]>(initialSuggestions)

  function buildBody() {
    // When athlete has gym, use gymRpe as the hardestRpe if it's higher
    const effectiveRpe = hasGym && gymRpe > 0
      ? Math.max(hardestRpe || 0, gymRpe)
      : (hardestRpe || 5)
    return {
      weightKg: weightKg ? Number(weightKg) : undefined,
      hrResting: hrResting ? Number(hrResting) : undefined,
      sleepHours: sleepHours ? Number(sleepHours) : undefined,
      sleepScore: sleepQuality > 0 ? sleepQuality * 10 : undefined,
      hardestRpe: effectiveRpe || 5,
      painLevel: painLevel > 0 ? painLevel : undefined,
      energyLevel: energyLevel || 5,
      stressLevel: stressLevel || undefined,
      motivationLevel: motivationLevel || undefined,
      nutritionAdherencePct: hasNutrition && nutritionAdherence > 0 ? nutritionAdherence * 10 : undefined,
      notes: notes || undefined,
      waistCm: waistCm ? Number(waistCm) : undefined,
      armsCm: armsCm ? Number(armsCm) : undefined,
      hipsCm: hipsCm ? Number(hipsCm) : undefined,
      thighsCm: thighsCm ? Number(thighsCm) : undefined,
    }
  }

  async function handleQuickSave() {
    await doSave({
      weightKg: undefined,
      hrResting: undefined,
      sleepHours: undefined,
      sleepScore: undefined,
      hardestRpe: 6,
      painLevel: undefined,
      energyLevel: 7,
      stressLevel: undefined,
      motivationLevel: undefined,
      nutritionAdherencePct: undefined,
      notes: undefined,
      waistCm: undefined,
      armsCm: undefined,
      hipsCm: undefined,
      thighsCm: undefined,
    })
  }

  function handleSubmit() {
    if (saving) return
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
      const json = await res.json() as {
        adjustment?: { severity: 'ok' | 'warning' | 'critical'; recommendation: string; adjustments: string[]; triggers: string[]; planChanges?: { volumeDeltaPct?: number; zonesAdjusted?: boolean }; nutritionChanges?: { newKcalHard?: number; newKcalEasy?: number } }
        suggestions?: CheckInSuggestion[]
      }
      if (json.adjustment) setAdjustment(json.adjustment)
      if (json.suggestions) setSuggestions(json.suggestions)
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el check-in. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function respondToSuggestion(id: string, action: 'accept' | 'reject') {
    await fetch(`/api/checkin/suggestions/${id}/${action}`, { method: 'POST' })
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  // ——— Estado: ya enviaste esta semana ———
  if (checkInState === 'submitted' && !openForm && !saved) {
    return (
      <SubmittedCheckInView
        prevMetrics={prevMetrics}
        weekLabel={weekLabel}
        submittedAt={submittedAt}
        submittedTriggers={submittedTriggers}
        lastWeekSummary={lastWeekSummary}
        suggestions={suggestions}
        onRespond={respondToSuggestion}
        onUpdate={() => setOpenForm(true)}
        onBack={() => router.push('/dashboard')}
      />
    )
  }

  // ——— Estado: temprano en la semana (Lun-Jue), aún no envió ———
  if (checkInState === 'early' && !openForm && !saved) {
    return (
      <EarlyCheckInScreen
        lastWeekSummary={lastWeekSummary}
        onForce={() => setOpenForm(true)}
        onBack={() => router.push('/dashboard')}
      />
    )
  }

  // ——— Pantalla de resultado post-save ———
  if (saved) {
    return (
      <CheckInResultScreen
        weekLabel={weekLabel}
        triggers={adjustment?.triggers ?? []}
        adjustments={adjustment?.adjustments ?? []}
        severity={adjustment?.severity ?? 'ok'}
        suggestions={suggestions}
        planChanges={adjustment?.planChanges}
        nutritionChanges={adjustment?.nutritionChanges}
        onBack={() => router.push('/dashboard')}
      />
    )
  }

  // ——— Form principal ———
  const adherencePct = weekAdherence.total > 0
    ? Math.round((weekAdherence.completed / weekAdherence.total) * 100)
    : null
  const painColor = painLevel >= 7 ? '#ef4444' : painLevel >= 4 ? '#ea580c' : '#22c55e'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#0f1e30]">Check-in Semanal</h1>
          <p className="text-sm text-gray-400 mt-0.5">{weekLabel} · Cuéntanos cómo te fue</p>
          <p className="text-xs text-gray-400 mt-2 max-w-lg">
            <span className="font-medium text-gray-500">¿Para qué sirve esto?</span> Acá reportás tu carga subjetiva de la semana: energía, estrés, dolor, RPE y motivación. Es distinto al registro diario de peso y FC en tu perfil — esas son métricas objetivas. El check-in semanal sincroniza tu bienestar con tu entrenamiento y va construyendo tu historial de progreso.
          </p>
        </div>

        {/* Check-in rápido */}
        <div className="mb-5 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-800">¿Semana sin novedades?</p>
            <p className="text-xs text-green-600 mt-0.5">Energía normal, sin dolores, cumpliste el plan.</p>
          </div>
          <button
            onClick={handleQuickSave}
            disabled={saving}
            className="shrink-0 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            {saving ? '...' : 'Todo bien →'}
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-5 space-y-5 lg:space-y-0">

          {/* Columna izquierda */}
          <div className="space-y-5">
            <section className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">📊 Métricas de la semana</h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                <MetricInput label="Peso corporal" value={weightKg} onChange={setWeightKg} unit="kg" step="0.1" inputMode="decimal" placeholder="ej. 70.5" prevValue={prevMetrics.weightKg} />
                <MetricInput label="Horas de sueño (prom.)" value={sleepHours} onChange={setSleepHours} unit="h" step="0.5" inputMode="decimal" placeholder="ej. 7.5" prevValue={prevMetrics.sleepHours} />
                <MetricInput label="FC reposo" value={hrResting} onChange={setHrResting} unit="bpm" placeholder="ej. 58" prevValue={prevMetrics.hrResting} invertDelta />
                <MetricSlider label="Energía percibida" value={energyLevel} onChange={setEnergyLevel} color="#ea580c" lowLabel="Sin energía" highLabel="Al 100%" prevValue={prevMetrics.energyLevel} />
                <MetricSlider label="RPE sesión más dura" value={hardestRpe} onChange={setHardestRpe} color="#ef4444" lowLabel="Fácil" highLabel="Al límite" prevValue={prevMetrics.hardestSessionRpe} />
                {hasGym && (
                  <MetricSlider label="RPE sesión de gym" value={gymRpe} onChange={setGymRpe} color="#7c3aed" lowLabel="Fácil" highLabel="Al límite" />
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowWellness(v => !v)}
                className="w-full px-6 py-5 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">😴 Bienestar general <span className="text-xs font-normal text-gray-400 ml-1">opcional</span></h2>
                <span className={`text-gray-400 text-sm transition-transform duration-200 ${showWellness ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {showWellness && (
                <div className="px-6 py-5 space-y-5">
                  <MetricSlider label="Calidad del sueño" value={sleepQuality} onChange={setSleepQuality} color="#1a9933" lowLabel="Muy mal" highLabel="Excelente" prevValue={prevMetrics.prevSleepScore} />
                  <MetricSlider label="Nivel de estrés" value={stressLevel} onChange={setStressLevel} color="#c33" lowLabel="Sin estrés" highLabel="Muy estresado" prevValue={prevMetrics.stressLevel} />
                  <MetricSlider label="Motivación" value={motivationLevel} onChange={setMotivationLevel} color="#1a9933" lowLabel="Sin motivación" highLabel="Muy motivado" prevValue={prevMetrics.motivationLevel} />
                  <MetricSlider label="Dolor / molestias" value={painLevel} onChange={setPainLevel} color={painColor} lowLabel="Sin dolor" highLabel="Dolor intenso" prevValue={prevMetrics.painLevel} />
                  {hasNutrition && (
                    <MetricSlider label="Adherencia al plan de comida" value={nutritionAdherence} onChange={setNutritionAdherence} color="#14b8a6" lowLabel="No lo seguí" highLabel="Al 100%" prevValue={prevMetrics.prevNutritionAdherence} />
                  )}
                </div>
              )}
              {!showWellness && (
                <p className="px-6 py-3 text-xs text-gray-400">Estrés, motivación, calidad de sueño, dolor — ayudan al sistema a ajustar mejor tu plan.</p>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMeasurements(v => !v)}
                className="w-full px-6 py-5 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">📏 Medidas corporales <span className="text-xs font-normal text-gray-400 ml-1">opcional</span></h2>
                <span className={`text-gray-400 text-sm transition-transform duration-200 ${showMeasurements ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {showMeasurements && (
                <div className="px-6 py-5 grid grid-cols-2 gap-4">
                  <MetricInput label="Cintura" value={waistCm} onChange={setWaistCm} unit="cm" step="0.5" inputMode="decimal" placeholder="ej. 78" />
                  <MetricInput label="Caderas" value={hipsCm} onChange={setHipsCm} unit="cm" step="0.5" inputMode="decimal" placeholder="ej. 96" />
                  <MetricInput label="Brazos" value={armsCm} onChange={setArmsCm} unit="cm" step="0.5" inputMode="decimal" placeholder="ej. 32" />
                  <MetricInput label="Muslos" value={thighsCm} onChange={setThighsCm} unit="cm" step="0.5" inputMode="decimal" placeholder="ej. 54" />
                </div>
              )}
              {!showMeasurements && (
                <p className="px-6 py-3 text-xs text-gray-400">Cintura, caderas, brazos y muslos — útil para ver recomposición aunque el peso no baje.</p>
              )}
            </section>

            {/* Notas + CTA (mobile) */}
            <section className="lg:hidden bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">Notas de la semana</h2>
              </div>
              <div className="px-6 py-5">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Las series del fartlek me costaron más de lo esperado..." rows={3} className="w-full text-sm bg-[#f7f7f7] rounded-lg px-3 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 text-[#4d4d4d] placeholder:text-[#808080]" />
              </div>
            </section>

            <div className="lg:hidden space-y-3">
              {formError && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{formError}</p>}
              {saveError && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{saveError}</p>}
              <p className="text-xs text-center text-gray-400">Estos datos ajustarán tu plan de la próxima semana automáticamente.</p>
              <button onClick={handleSubmit} disabled={saving} className="w-full bg-[#ea580c] hover:opacity-90 active:opacity-80 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-opacity shadow-md">
                {saving ? 'Guardando...' : 'Enviar check-in'}
              </button>
            </div>
          </div>

          {/* Columna derecha (sticky desktop) */}
          <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">✅ Sesiones completadas</h2>
                {adherencePct !== null && (
                  <span className="text-sm font-bold text-[#1e3a5f]">{weekAdherence.completed}/{weekAdherence.total}</span>
                )}
              </div>
              {adherencePct !== null && (
                <div className="px-6 pt-4 pb-2">
                  <div className="h-[6px] bg-[#e6e6e6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${adherencePct}%`, backgroundColor: adherencePct >= 80 ? '#1a9933' : adherencePct >= 50 ? '#ea580c' : '#ef4444' }} />
                  </div>
                </div>
              )}
              <SessionsPanel sessions={weekSessions} showHeader={false} />
            </div>

            <div className="bg-white rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-[#0f1e30]">📝 Notas de la semana</h2>
              </div>
              <div className="px-6 py-5">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Las series del fartlek me costaron más de lo esperado..." rows={3} className="w-full text-sm bg-[#f7f7f7] rounded-lg px-3 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 text-[#4d4d4d] placeholder:text-[#808080]" />
              </div>
            </div>

            {(formError || saveError) && (
              <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-3">{formError ?? saveError}</p>
            )}
            <button onClick={handleSubmit} disabled={saving} className="w-full bg-[#ea580c] hover:opacity-90 active:opacity-80 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-opacity shadow-md">
              {saving ? 'Guardando...' : 'Enviar check-in'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de alertas */}
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
              <button onClick={() => setShowAlertModal(false)} className="py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Revisar datos
              </button>
              <button onClick={() => doSave(buildBody())} disabled={saving} className="py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors">
                {saving ? 'Guardando...' : 'Entendido, guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
