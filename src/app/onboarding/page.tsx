'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  WizardData,
  INITIAL_DATA,
  getSteps,
  StepId,
  ActivityType,
  GymGoal,
  ExperienceLevel,
  isStepValid,
} from './_types'

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function SelectCard({
  selected,
  onClick,
  icon,
  label,
  subtext,
}: {
  selected: boolean
  onClick: () => void
  icon: string
  label: string
  subtext?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-150 flex items-start gap-4',
        selected
          ? 'border-[#f97316] bg-[#f97316]/8'
          : 'border-gray-200 bg-white hover:border-[#1e3a5f]/40'
      )}
    >
      <span className="text-2xl leading-none mt-0.5">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className={cn('font-semibold text-base', selected ? 'text-[#f97316]' : 'text-[#1e3a5f]')}>
          {label}
        </span>
        {subtext && <span className="text-sm text-gray-500">{subtext}</span>}
      </span>
      <span
        className={cn(
          'ml-auto w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors',
          selected ? 'border-[#f97316] bg-[#f97316]' : 'border-gray-300'
        )}
      >
        {selected && (
          <svg viewBox="0 0 20 20" fill="white" className="w-full h-full p-0.5">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </button>
  )
}

function ToggleBtn({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150',
        selected
          ? 'border-[#f97316] bg-[#f97316] text-white'
          : 'border-gray-200 bg-white text-[#1e3a5f] hover:border-[#1e3a5f]/40'
      )}
    >
      {label}
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-[#1e3a5f] mb-1.5">{children}</p>
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-[#1e3a5f] transition-colors bg-white"
    />
  )
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepGoal({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  const activities: { value: ActivityType; icon: string; label: string; subtext: string }[] = [
    { value: 'GYM',     icon: '🏋️', label: 'Gym',            subtext: 'Rutinas de pesas, recomposición corporal' },
    { value: 'RUNNING', icon: '🏃', label: 'Running',         subtext: 'Correr, mejorar ritmo y resistencia' },
    { value: 'BOTH',    icon: '🏅', label: 'Gym + Running',   subtext: 'Combino entrenamiento de fuerza y cardio' },
    { value: 'FREE',    icon: '📊', label: 'Solo trackear',   subtext: 'Registro libre — sin plan estructurado' },
  ]

  const gymGoals: { value: GymGoal; icon: string; label: string }[] = [
    { value: 'MUSCLE_GAIN',   icon: '📈', label: 'Ganar músculo' },
    { value: 'FAT_LOSS',      icon: '🔥', label: 'Perder grasa' },
    { value: 'RECOMPOSITION', icon: '⚖️', label: 'Los dos (recomposición)' },
  ]

  const showGymGoal = data.activityType === 'GYM' || data.activityType === 'BOTH'

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold text-[#1e3a5f] mb-1">¿Cómo quieres entrenar?</h2>
      <p className="text-gray-500 text-sm mb-4">Medalliq se adapta a tu forma de entrenar — sin obligarte a seguir un plan.</p>

      {activities.map((a) => (
        <SelectCard
          key={a.value}
          selected={data.activityType === a.value}
          onClick={() => update({ activityType: a.value, gymGoal: null })}
          icon={a.icon}
          label={a.label}
          subtext={a.subtext}
        />
      ))}

      {showGymGoal && (
        <div className="mt-1 p-4 rounded-2xl border-2 border-[#1e3a5f]/20 bg-[#1e3a5f]/3">
          <p className="text-sm font-semibold text-[#1e3a5f] mb-3">¿Cuál es tu meta en el gym?</p>
          <div className="flex flex-col gap-2">
            {gymGoals.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => update({ gymGoal: g.value })}
                className={cn(
                  'px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left flex items-center gap-2',
                  data.gymGoal === g.value
                    ? 'border-[#f97316] bg-[#f97316]/10 text-[#f97316]'
                    : 'border-gray-200 bg-white text-[#1e3a5f] hover:border-[#1e3a5f]/40'
                )}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StepPhysical({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  const hasGym = data.activityType === 'GYM' || data.activityType === 'BOTH'
  const levels: { value: ExperienceLevel; label: string; subtext: string }[] = [
    { value: 'BEGINNER',     label: 'Principiante', subtext: 'Menos de 1 año' },
    { value: 'INTERMEDIATE', label: 'Intermedio',   subtext: '1–3 años' },
    { value: 'ADVANCED',     label: 'Avanzado',     subtext: 'Más de 3 años' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-2xl font-bold text-[#1e3a5f] mb-1">Datos básicos</h2>
      <p className="text-gray-500 text-sm mb-2">Con esto calculamos tus calorías y macros.</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Edad (años)</Label>
          <Input
            type="number"
            placeholder="32"
            value={data.age ?? ''}
            onChange={(e) => update({ age: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div>
          <Label>Talla (cm)</Label>
          <Input
            type="number"
            placeholder="170"
            value={data.heightCm ?? ''}
            onChange={(e) => update({ heightCm: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      <div>
        <Label>Peso actual (kg)</Label>
        <Input
          type="number"
          placeholder="68"
          value={data.weightKg ?? ''}
          onChange={(e) => update({ weightKg: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      <div>
        <Label>Género</Label>
        <div className="flex gap-3 mt-1">
          <ToggleBtn selected={data.gender === 'male'}   onClick={() => update({ gender: 'male' })}   label="Hombre" />
          <ToggleBtn selected={data.gender === 'female'} onClick={() => update({ gender: 'female' })} label="Mujer" />
        </div>
      </div>

      <div>
        <Label>Días disponibles para entrenar por semana</Label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {[3, 4, 5, 6].map((d) => (
            <ToggleBtn
              key={d}
              selected={data.daysPerWeek === d}
              onClick={() => update({ daysPerWeek: d })}
              label={`${d} días`}
            />
          ))}
        </div>
      </div>

      {/* Nivel de experiencia — opcional pero útil para intensidades */}
      <div>
        <Label>Nivel de experiencia (opcional)</Label>
        <div className="flex flex-col gap-2 mt-1">
          {levels.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => update({ experienceLevel: data.experienceLevel === l.value ? null : l.value })}
              className={cn(
                'px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left flex items-center justify-between',
                data.experienceLevel === l.value
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              <span className="font-semibold">{l.label}</span>
              <span className="text-xs text-gray-400">{l.subtext}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Peso objetivo — opcional, solo si tiene sentido */}
      {(hasGym || data.activityType === 'FREE') && (
        <div>
          <Label>Peso objetivo (kg) — opcional</Label>
          <Input
            type="number"
            placeholder="65"
            value={data.weightGoalKg ?? ''}
            onChange={(e) => update({ weightGoalKg: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      )}
    </div>
  )
}

function StepGenerating() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-[#1e3a5f]/10" />
        <div className="absolute inset-0 rounded-full border-4 border-t-[#f97316] animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">⚡</span>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-[#1e3a5f]">Configurando tu cuenta...</p>
        <p className="text-sm text-gray-400 mt-1">Calculando calorías, macros y preparando tu espacio</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<StepId, string> = {
  'goal':       'Tu actividad',
  'physical':   'Tus datos',
  'generating': 'Configurando',
}

export default function OnboardingPage() {
  const router = useRouter()
  const { update: refreshSession } = useSession()
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [stepIndex, setStepIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  const steps = getSteps(data)
  const currentStepId = steps[stepIndex]
  const totalSteps = steps.length
  const progressPct = Math.min(((stepIndex + 1) / totalSteps) * 100, 100)
  const isLastDataStep = steps[stepIndex + 1] === 'generating'

  function nextStep() {
    if (!isStepValid(currentStepId, data)) return
    if (isLastDataStep) {
      void handleSubmit()
      return
    }
    const updatedSteps = getSteps(data)
    if (stepIndex < updatedSteps.length - 1) {
      setStepIndex(stepIndex + 1)
    }
  }

  function prevStep() {
    if (stepIndex === 0) return
    setStepIndex(stepIndex - 1)
  }

  async function handleSubmit() {
    setStepIndex(steps.indexOf('generating'))
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/onboarding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error configurando la cuenta')

      await refreshSession({ onboardingCompleted: true })
      router.push(json.isB2B ? '/pending' : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStepIndex(steps.indexOf('generating') > 0 ? steps.indexOf('generating') - 1 : 0)
    } finally {
      setIsGenerating(false)
    }
  }

  const stepContent: Record<StepId, React.ReactNode> = {
    goal:       <StepGoal data={data} update={update} />,
    physical:   <StepPhysical data={data} update={update} />,
    generating: <StepGenerating />,
  }

  const isGeneratingStep = currentStepId === 'generating'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[600px] mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-bold text-[#1e3a5f]">Medaliq</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500 text-sm flex-1">
            Paso {stepIndex + 1} de {totalSteps} — {STEP_LABELS[currentStepId]}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Salir
          </button>
        </div>
        <div className="h-1 bg-gray-100 w-full">
          <div
            className="h-1 bg-[#f97316] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-[600px] w-full mx-auto px-4 py-8 pb-32">
        <div key={currentStepId} className="animate-in fade-in slide-in-from-right-4 duration-200">
          {stepContent[currentStepId]}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
      </main>

      {/* Footer nav */}
      {!isGeneratingStep && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="max-w-[600px] mx-auto px-4 py-4 flex gap-3">
            {stepIndex > 0 && (
              <button
                onClick={prevStep}
                disabled={isGenerating}
                className="flex-1 border-2 border-gray-200 text-[#1e3a5f] font-semibold py-3 rounded-xl"
              >
                ← Atrás
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={!isStepValid(currentStepId, data) || isGenerating}
              className="flex-1 bg-[#f97316] hover:bg-[#ea6c0a] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLastDataStep ? 'Guardar y entrar →' : 'Siguiente →'}
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
