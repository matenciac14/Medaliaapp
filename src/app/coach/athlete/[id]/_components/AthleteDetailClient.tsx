'use client'

import { useState, useEffect } from 'react'
import { getInitialWeekIdx } from '@/lib/core/week-number'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AthleteFeatureToggles from './AthleteFeatureToggles'
import NutritionConstructor from './NutritionConstructor'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AthleteData = {
  id: string
  name: string | null
  email: string
  createdAt: Date
}

export type HealthProfileData = {
  age: number
  weightKg: number
  weightGoalKg: number | null
  hrResting: number | null
  hrMax: number | null
  heightCm: number
  injuries: string[]
  conditions: string[]
  sport: string | null
  experienceLevel: string | null
  ftp: number | null
} | null

export type PlanWeekData = {
  weekNumber: number
  phase: string
  focusDescription: string | null
  isRecoveryWeek: boolean
  sessions: {
    id: string
    dayOfWeek: number
    type: string
    durationMin: number
    detailText: string | null
    zoneTarget: string | null
    coachNote: string | null
    structure: string | null
    intensity: string
    date: Date | null
  }[]
}

export type ActivePlanData = {
  id: string
  name: string
  totalWeeks: number
  startDate: Date
  status: string
  weeks: PlanWeekData[]
} | null

export type CheckInData = {
  id: string
  weekNumber: number
  recordedAt: Date
  weightKg: number | null
  hrResting: number | null
  sleepScore: number | null
  energyLevel: number | null
  stressLevel: number | null
  motivationLevel: number | null
  painLevel: number | null
  dietAdherencePct: number | null
  painFlag: boolean
  hardestSessionRpe: number | null
  adjustmentsTriggered: string[]
  notes: string | null
  waistCm: number | null
  armsCm: number | null
  hipsCm: number | null
  thighsCm: number | null
}

export type NutritionPlanData = {
  tdee: number
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
} | null

export type InitialFeatures = {
  plan: boolean
  checkin: boolean
  nutrition: boolean
  progress: boolean
}

export type AthleteStatus = 'ACTIVE' | 'PAUSED'

// ─── Gym Types ───────────────────────────────────────────────────────────────

type GymExerciseLog = {
  exerciseId: string
  name: string
  muscleGroups: string[]
  logs: {
    date: string
    sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null }[]
  }[]
}

// ─── Day name map ─────────────────────────────────────────────────────────────

const DAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2',
  FARTLEK: 'Fartlek',
  TEMPO: 'Tempo',
  INTERVALOS: 'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  FUERZA: 'Fuerza',
  CICLA: 'Ciclismo',
  NATACION: 'Natación',
  DESCANSO: 'Descanso',
  TEST: 'Test',
  SIMULACRO: 'Simulacro',
  OTRO: 'Otro',
}

const TABS = ['Resumen', 'Plan', 'Progreso', 'Nutrición', 'Sesiones', 'Benchmarks', 'Ejercicios', 'Mensajes']

// ── Template preview info (feature C) ────────────────────────────────────────
const TEMPLATE_PREVIEW: Record<string, { weeks: number; description: string; phases: string[] }> = {
  RACE_5K:             { weeks: 8,  description: 'Intervalos progresivos + fartlek semanal.', phases: ['BASE 3 sem', 'DESARROLLO 3 sem', 'AFINAMIENTO 2 sem'] },
  RACE_10K:            { weeks: 12, description: 'Volumen aeróbico + tempo runs y series.', phases: ['BASE 4 sem', 'DESARROLLO 5 sem', 'ESPECÍFICO 2 sem', 'AFINAMIENTO 1 sem'] },
  STRENGTH_TRAINING:   { weeks: 16, description: 'Splits Push/Pull/Legs con progresión de cargas.', phases: ['BASE 4 sem', 'DESARROLLO 6 sem', 'ESPECÍFICO 4 sem', 'AFINAMIENTO 2 sem'] },
  BODY_RECOMPOSITION:  { weeks: 16, description: 'Fuerza + cardio moderado para recomposición.', phases: ['BASE 4 sem', 'DESARROLLO 6 sem', 'ESPECÍFICO 4 sem', 'AFINAMIENTO 2 sem'] },
}

const INTENSITY_SCORE: Record<string, number> = { HIGH: 3, MODERATE: 2, LOW: 1, REST: 0 }

// ── Benchmark constants ───────────────────────────────────────────────────────

type BenchmarkItem = {
  id: string; userId: string; coachId: string | null
  sport: string; metric: string; value: number; unit: string
  testedAt: string; notes: string | null; createdAt: string
}

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Running', STRENGTH: 'Fuerza',
  CYCLING: 'Ciclismo', SWIMMING: 'Natación', TRIATHLON: 'Triatlón', FOOTBALL: 'Fútbol',
}

// Ajuste calórico recomendado por fase de entrenamiento
const PHASE_KCAL_DELTA: Record<string, { label: string; delta: number; desc: string }> = {
  BASE:        { label: 'BASE',        delta: -200, desc: 'Déficit leve (−200 kcal)' },
  DESARROLLO:  { label: 'DESARROLLO',  delta:    0, desc: 'Mantenimiento' },
  ESPECIFICO:  { label: 'ESPECÍFICO',  delta: +100, desc: 'Superávit leve (+100 kcal)' },
  ESPECÍFICO:  { label: 'ESPECÍFICO',  delta: +100, desc: 'Superávit leve (+100 kcal)' },
  AFINAMIENTO: { label: 'AFINAMIENTO', delta: -100, desc: 'Reducción leve (−100 kcal)' },
}

const METRIC_OPTIONS: Record<string, { metric: string; label: string; unit: string }[]> = {
  RUNNING:  [
    { metric: '5K_TIME',            label: '5K',            unit: 'seconds' },
    { metric: '10K_TIME',           label: '10K',           unit: 'seconds' },
    { metric: 'HALF_MARATHON_TIME', label: 'Media Maratón', unit: 'seconds' },
    { metric: 'MARATHON_TIME',      label: 'Maratón',       unit: 'seconds' },
  ],
  STRENGTH: [
    { metric: '1RM_SQUAT',    label: '1RM Sentadilla',  unit: 'kg' },
    { metric: '1RM_DEADLIFT', label: '1RM Peso muerto', unit: 'kg' },
    { metric: '1RM_BENCH',    label: '1RM Press banca', unit: 'kg' },
  ],
}

const METRIC_LABELS: Record<string, string> = {
  '5K_TIME': '5K', '10K_TIME': '10K', 'HALF_MARATHON_TIME': 'Media Maratón',
  'MARATHON_TIME': 'Maratón', 'FTP_WATTS': 'FTP', 'CSS_PACE': 'CSS Pace',
  '1RM_SQUAT': '1RM Sentadilla', '1RM_DEADLIFT': '1RM Peso muerto', '1RM_BENCH': '1RM Press banca',
}

function parseTimeToSeconds(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return Number(str)
}

function weekLoadScore(sessions: { intensity: string }[]) {
  return sessions.reduce((sum, s) => sum + (INTENSITY_SCORE[s.intensity] ?? 2), 0)
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AthleteDetailClientProps {
  athleteId: string
  athlete: AthleteData
  healthProfile: HealthProfileData
  activePlan: ActivePlanData
  recentCheckIns: CheckInData[]
  nutritionPlan: NutritionPlanData
  initialFeatures: InitialFeatures
  initialStatus: AthleteStatus
  coachGoal: string | null
  privateNotes: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AthleteDetailClient({
  athleteId,
  athlete,
  healthProfile,
  activePlan,
  recentCheckIns,
  nutritionPlan,
  initialFeatures,
  initialStatus,
  coachGoal: initialCoachGoal,
  privateNotes: initialPrivateNotes,
}: AthleteDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('Resumen')

  // Initialize notes from server data (persisted coachNotes)
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    activePlan?.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        if (s.coachNote) initial[s.id] = s.coachNote
      })
    })
    return initial
  })
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})

  // Plan week navigation — show one week at a time to avoid rendering 90 sessions at once
  const [planViewWeekIdx, setPlanViewWeekIdx] = useState(() => getInitialWeekIdx(activePlan))

  // Plan creation state
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [planGoalType, setPlanGoalType] = useState('RACE_5K')
  const [planDaysPerWeek, setPlanDaysPerWeek] = useState(4)
  const [planGenerating, setPlanGenerating] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planCreated, setPlanCreated] = useState(false)

  // Copy-from mode
  const [planMode, setPlanMode] = useState<'template' | 'copy'>('template')
  const [copySourcePlanId, setCopySourcePlanId] = useState('')
  const [copyStartDate, setCopyStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [availablePlans, setAvailablePlans] = useState<{ planId: string; planName: string; totalWeeks: number; athleteName: string; status: string }[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  async function loadAvailablePlans() {
    setLoadingPlans(true)
    try {
      const res = await fetch('/api/coach/plans')
      if (!res.ok) throw new Error()
      const { plans } = await res.json()
      const filtered = (plans as typeof availablePlans).filter((p) => p.planId !== (activePlan as { id?: string } | null)?.id)
      setAvailablePlans(filtered)
      if (filtered.length > 0) setCopySourcePlanId(filtered[0].planId)
    } catch { /* silently fail */ } finally {
      setLoadingPlans(false)
    }
  }

  async function handleCopyPlan() {
    if (!copySourcePlanId || !copyStartDate) return
    setPlanGenerating(true)
    setPlanError(null)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/plan/copy-from`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePlanId: copySourcePlanId, startDate: copyStartDate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error copiando el plan')
      setPlanCreated(true)
      setCreatingPlan(false)
      router.push(`/coach/athlete/${athleteId}/plan/build`)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setPlanGenerating(false)
    }
  }

  async function handleCreatePlan() {
    setPlanGenerating(true)
    setPlanError(null)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalType: planGoalType, daysPerWeek: planDaysPerWeek, hoursPerSession: 1 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error generando el plan')
      setPlanCreated(true)
      setCreatingPlan(false)
      router.push(`/coach/athlete/${athleteId}/plan/build`)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setPlanGenerating(false)
    }
  }

  // Activation state
  const [activating, setActivating] = useState(false)
  const [activated, setActivated] = useState(initialFeatures.plan)

  async function handleActivate() {
    setActivating(true)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/config`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features: { plan: true, checkin: true, nutrition: true, progress: true, log: true, gym: true } }) })
      if (res.ok) setActivated(true)
    } finally {
      setActivating(false)
    }
  }

  // Reset password state
  const [resettingPwd, setResettingPwd] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [pwdCopied, setPwdCopied] = useState(false)

  async function handleResetPassword() {
    setResettingPwd(true)
    setResetLink(null)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setResetLink(data.resetLink)
    } finally {
      setResettingPwd(false)
    }
  }

  async function handleCopyPassword() {
    if (!resetLink) return
    try {
      await navigator.clipboard.writeText(resetLink)
      setPwdCopied(true)
      setTimeout(() => setPwdCopied(false), 2000)
    } catch { /* no-op */ }
  }

  // ── Coach goal & private notes ───────────────────────────────────────────────
  const [coachGoal, setCoachGoal] = useState(initialCoachGoal ?? '')
  const [privateNotes, setPrivateNotes] = useState(initialPrivateNotes ?? '')
  const [savingCoachNotes, setSavingCoachNotes] = useState(false)
  const [coachNotesSaved, setCoachNotesSaved] = useState(false)

  async function handleSaveCoachNotes() {
    setSavingCoachNotes(true)
    setCoachNotesSaved(false)
    try {
      await fetch(`/api/coach/athlete/${athleteId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachGoal: coachGoal.trim() || null, privateNotes: privateNotes.trim() || null }),
      })
      setCoachNotesSaved(true)
      setTimeout(() => setCoachNotesSaved(false), 2500)
    } finally {
      setSavingCoachNotes(false)
    }
  }

  // ── Athlete status (ACTIVE / PAUSED) ────────────────────────────────────────
  const [athleteStatus, setAthleteStatus] = useState<AthleteStatus>(initialStatus)
  const [togglingStatus, setTogglingStatus] = useState(false)

  async function handleToggleStatus() {
    const next: AthleteStatus = athleteStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setTogglingStatus(true)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) setAthleteStatus(next)
    } finally {
      setTogglingStatus(false)
    }
  }

  // ── Benchmarks ──────────────────────────────────────────────────────────────
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([])
  const [benchmarksLoading, setBenchmarksLoading] = useState(false)
  const [showBenchmarkForm, setShowBenchmarkForm] = useState(false)
  const [benchmarkSport, setBenchmarkSport] = useState('RUNNING')
  const [benchmarkMetric, setBenchmarkMetric] = useState('5K_TIME')
  const [benchmarkValueStr, setBenchmarkValueStr] = useState('')
  const [benchmarkDate, setBenchmarkDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [benchmarkNotes, setBenchmarkNotes] = useState('')
  const [savingBenchmark, setSavingBenchmark] = useState(false)

  useEffect(() => {
    setBenchmarksLoading(true)
    fetch(`/api/coach/athlete/${athleteId}/benchmarks`)
      .then(r => r.json())
      .then(d => setBenchmarks(d.benchmarks ?? []))
      .catch(() => {})
      .finally(() => setBenchmarksLoading(false))
  }, [athleteId])

  function formatBenchmarkValue(value: number, unit: string, _metric?: string): string {
    if (unit === 'seconds') {
      const h = Math.floor(value / 3600)
      const m = Math.floor((value % 3600) / 60)
      const s = Math.round(value % 60)
      if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      return `${m}:${String(s).padStart(2,'0')}`
    }
    if (unit === 'watts') return `${value} W`
    if (unit === 'kg') return `${value} kg`
    return String(value)
  }

  async function handleAddBenchmark() {
    const opts = METRIC_OPTIONS[benchmarkSport] ?? []
    const opt = opts.find(o => o.metric === benchmarkMetric) ?? opts[0]
    if (!opt || !benchmarkValueStr) return
    const rawValue = opt.unit === 'seconds' ? parseTimeToSeconds(benchmarkValueStr) : Number(benchmarkValueStr)
    setSavingBenchmark(true)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/benchmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: benchmarkSport, metric: opt.metric, value: rawValue, unit: opt.unit, testedAt: benchmarkDate, notes: benchmarkNotes || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setBenchmarks(prev => [data.benchmark, ...prev])
        setShowBenchmarkForm(false)
        setBenchmarkValueStr(''); setBenchmarkNotes('')
      }
    } finally {
      setSavingBenchmark(false)
    }
  }

  async function handleDeleteBenchmark(benchmarkId: string) {
    const res = await fetch(`/api/coach/athlete/${athleteId}/benchmarks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ benchmarkId }),
    })
    if (res.ok) setBenchmarks(prev => prev.filter(b => b.id !== benchmarkId))
  }

  // Nutrition edit state
  const [editingNutrition, setEditingNutrition] = useState(false)
  const [nutritionDraft, setNutritionDraft] = useState<NutritionPlanData>(nutritionPlan)
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [nutritionSaveError, setNutritionSaveError] = useState<string | null>(null)

  // Meal plan + food profile (lazy load on tab open)
  type MealPlanData = { data: unknown; updatedAt: string } | null
  type FoodProfileData = {
    availableFoods: string[]
    availableFoodIds: string[]
    restrictions: string[]
    mealsPerDay: number
    weighsFood: boolean
    notes: string | null
  } | null
  type AthleteFoodItem = {
    id: string; name: string; category: string
    kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number
    servingG: number; servingLabel?: string | null
  }
  type FoodLogEntry = {
    id: string
    date: string
    mealType: string
    kcalLogged: number | null
    proteinLogged: number | null
    carbsLogged: number | null
    fatLogged: number | null
    food: { name: string }
  }
  const [mealPlan, setMealPlan] = useState<MealPlanData>(null)
  const [foodProfile, setFoodProfile] = useState<FoodProfileData>(null)
  const [athleteFoods, setAthleteFoods] = useState<AthleteFoodItem[]>([])
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([])
  const [nutritionExtLoaded, setNutritionExtLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Nutrición' || nutritionExtLoaded) return
    fetch(`/api/coach/athlete/${athleteId}/nutrition`)
      .then(r => r.json())
      .then(d => {
        setMealPlan(d.mealPlan ?? null)
        setFoodProfile(d.foodProfile ?? null)
        setAthleteFoods(d.athleteFoods ?? [])
        setFoodLogs(d.foodLogs ?? [])
        setNutritionExtLoaded(true)
      })
      .catch(() => setNutritionExtLoaded(true))
  }, [activeTab, nutritionExtLoaded, athleteId])

  // Session editor state
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [sessionDraft, setSessionDraft] = useState<{ durationMin: number; type: string; zoneTarget: string; detailText: string; structure: string }>({
    durationMin: 60, type: '', zoneTarget: '', detailText: '', structure: ''
  })
  const [savingSession, setSavingSession] = useState(false)

  async function handleSaveSession(sessionId: string) {
    setSavingSession(true)
    try {
      await fetch(`/api/coach/sessions/${sessionId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionDraft),
      })
      setEditingSession(null)
      router.refresh()
    } finally {
      setSavingSession(false)
    }
  }

  // Gym tab state (Sesiones — exercise logs history)
  const [gymLogs, setGymLogs] = useState<GymExerciseLog[]>([])
  const [gymLoading, setGymLoading] = useState(false)
  const [gymLoaded, setGymLoaded] = useState(false)

  // Gym tab state (Gym — assigned routine + recent sessions)
  type GymAssignedDay = {
    id: string; dayOfWeek: number; label: string
    muscleGroups: string[]; isRestDay: boolean
    exercises: { id: string; sets: number; repsScheme: string; exercise: { id: string; name: string; muscleGroups: string[] } }[]
  }
  type GymAssignedData = {
    assignment: {
      id: string; startDate: string; endDate: string | null; notes: string | null
      template: { id: string; name: string; goal: string | null; level: string | null; daysPerWeek: number; days: GymAssignedDay[] }
    } | null
    recentSessions: { id: string; date: string; dayOfWeek: number; durationMin: number | null; rpe: number | null; overridesCount: number; source: 'assignment' | 'plan'; label: string | null }[]
    runningSessions: Record<number, { type: string; durationMin: number | null; intensity: string }>
  }
  const [gymAssigned, setGymAssigned] = useState<GymAssignedData>({ assignment: null, recentSessions: [], runningSessions: {} })
  const [gymAssignedLoading, setGymAssignedLoading] = useState(false)
  const [gymAssignedLoaded, setGymAssignedLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Ejercicios' || gymAssignedLoaded) return
    setGymAssignedLoading(true)
    fetch(`/api/coach/gym/athlete/${athleteId}/assigned`)
      .then(r => r.json())
      .then(data => { setGymAssigned(data); setGymAssignedLoaded(true) })
      .catch(() => setGymAssignedLoaded(true))
      .finally(() => setGymAssignedLoading(false))
  }, [activeTab, gymAssignedLoaded, athleteId])

  useEffect(() => {
    if (activeTab !== 'Sesiones' || gymLoaded) return
    setGymLoading(true)
    fetch(`/api/coach/gym/athlete/${athleteId}/logs`)
      .then((r) => r.json())
      .then((data) => {
        setGymLogs(Array.isArray(data) ? data : [])
        setGymLoaded(true)
      })
      .catch(() => setGymLogs([]))
      .finally(() => setGymLoading(false))
  }, [activeTab, gymLoaded, athleteId])

  // ── Mensajes state ───────────────────────────────────────────────────────────
  type Msg = { id: string; fromId: string; toId: string; content: string; readAt: string | null; createdAt: string }
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [msgsLoaded, setMsgsLoaded] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [msgSending, setMsgSending] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Mensajes') return
    const load = () =>
      fetch(`/api/messages?with=${athleteId}`)
        .then(r => r.json())
        .then(d => { setMsgs(d.messages ?? []); setMsgsLoaded(true) })
        .catch(() => setMsgsLoaded(true))
    load()
    // Mark messages from athlete as read
    fetch('/api/messages/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromId: athleteId }) })
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [activeTab, athleteId])

  async function handleSendMessage() {
    if (!msgInput.trim() || msgSending) return
    setMsgSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toId: athleteId, content: msgInput.trim() }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMsgs(prev => [...prev, message])
        setMsgInput('')
      }
    } finally {
      setMsgSending(false)
    }
  }

  function handleNoteChange(sessionId: string, value: string) {
    setNotes((prev) => ({ ...prev, [sessionId]: value }))
    setSavedNotes((prev) => ({ ...prev, [sessionId]: false }))
  }

  async function handleSaveNote(sessionId: string) {
    setSavingNotes((prev) => ({ ...prev, [sessionId]: true }))
    try {
      await fetch(`/api/coach/sessions/${sessionId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes[sessionId] ?? '' }),
      })
      setSavedNotes((prev) => ({ ...prev, [sessionId]: true }))
    } finally {
      setSavingNotes((prev) => ({ ...prev, [sessionId]: false }))
    }
  }

  async function handleSaveNutrition() {
    if (!nutritionDraft) return
    setSavingNutrition(true)
    setNutritionSaveError(null)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/nutrition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nutritionDraft),
      })
      if (res.ok) {
        setEditingNutrition(false)
      } else {
        setNutritionSaveError('Error al guardar. Inténtalo de nuevo.')
      }
    } catch {
      setNutritionSaveError('Error de conexión.')
    } finally {
      setSavingNutrition(false)
    }
  }

  // HR zones calculation
  const hrMaxValue = healthProfile?.hrMax ?? (healthProfile?.age ? 220 - healthProfile.age : 185)
  const zones = [
    { label: 'Z1 — Recuperación', min: Math.round(hrMaxValue * 0.5), max: Math.round(hrMaxValue * 0.6) },
    { label: 'Z2 — Base aeróbica', min: Math.round(hrMaxValue * 0.6), max: Math.round(hrMaxValue * 0.7) },
    { label: 'Z3 — Tempo', min: Math.round(hrMaxValue * 0.7), max: Math.round(hrMaxValue * 0.8) },
    { label: 'Z4 — Umbral', min: Math.round(hrMaxValue * 0.8), max: Math.round(hrMaxValue * 0.9) },
    { label: 'Z5 — VO2max', min: Math.round(hrMaxValue * 0.9), max: hrMaxValue },
  ]

  // Derived data for Resumen
  const latestCheckIn = recentCheckIns[0] ?? null
  const checkInsSorted = [...recentCheckIns].sort((a, b) => a.weekNumber - b.weekNumber)

  const weights = checkInsSorted.map((c) => c.weightKg).filter((w): w is number => w !== null)
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0

  // Last check-in days ago
  const lastCheckInDaysAgo = latestCheckIn
    ? Math.floor((Date.now() - new Date(latestCheckIn.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Alerts based on real data
  const alerts: string[] = []
  if (recentCheckIns.length === 0) {
    alerts.push('Sin check-ins registrados aún')
  }
  if (lastCheckInDaysAgo !== null && lastCheckInDaysAgo >= 7) {
    alerts.push(`Check-in pendiente hace ${lastCheckInDaysAgo} días`)
  }
  if (latestCheckIn?.painFlag) {
    alerts.push('Reporte de dolor en el último check-in')
  }
  if (latestCheckIn?.hrResting !== null && latestCheckIn?.hrResting !== undefined &&
      healthProfile?.hrResting !== null && healthProfile?.hrResting !== undefined &&
      latestCheckIn.hrResting > healthProfile.hrResting + 10) {
    alerts.push('FC reposo elevada respecto al valor basal')
  }

  // Display name initials
  const displayName = athlete.name ?? athlete.email
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Current training phase (for nutrition phase-based suggestions) — usa getPlanWeekNumber como fuente canónica
  const currentPhase = (() => {
    if (!activePlan || activePlan.weeks.length === 0) return null
    const idx = getInitialWeekIdx(activePlan)
    return activePlan.weeks[idx]?.phase ?? null
  })()

  function applyPhaseTargets() {
    if (!nutritionPlan || !currentPhase) return
    const delta = PHASE_KCAL_DELTA[currentPhase]?.delta ?? 0
    setNutritionDraft({
      ...nutritionPlan,
      targetKcalHard: nutritionPlan.tdee + delta + 300,
      targetKcalEasy: nutritionPlan.tdee + delta,
      targetKcalRest: nutritionPlan.tdee + delta - 200,
    })
    setEditingNutrition(true)
  }

  // Plan info from config (via activePlan or healthProfile)
  const currentWeekLabel = activePlan ? `Semana activa desde ${new Date(activePlan.startDate).toLocaleDateString('es-CO')}` : null

  return (
    <div className="px-4 py-4 lg:p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/coach/athletes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        ← Mis Atletas
      </Link>

      {/* Athlete header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={
                athleteStatus === 'ACTIVE'
                  ? { backgroundColor: '#dcfce7', color: '#15803d' }
                  : { backgroundColor: '#fef3c7', color: '#92400e' }
              }
            >
              {athleteStatus === 'ACTIVE' ? 'Activo' : 'Pausado'}
            </span>
          </div>
          <p className="text-sm text-gray-500">{athlete.email}</p>
        </div>
        <button
          onClick={handleToggleStatus}
          disabled={togglingStatus}
          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
          style={
            athleteStatus === 'ACTIVE'
              ? { borderColor: '#d1d5db', color: '#6b7280' }
              : { borderColor: '#1e3a5f', color: '#1e3a5f' }
          }
        >
          {togglingStatus ? '...' : athleteStatus === 'ACTIVE' ? 'Pausar' : 'Reactivar'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="px-3 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap shrink-0"
            style={
              activeTab === t
                ? { color: '#1e3a5f', borderBottom: '2px solid #1e3a5f', marginBottom: '-1px' }
                : { color: '#6b7280' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: Resumen ──────────────────────────────────────────────────────── */}
      {activeTab === 'Resumen' && (
        <div className="space-y-6">
          {/* Perfil */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Perfil del atleta</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Peso actual" value={healthProfile?.weightKg ? `${healthProfile.weightKg} kg` : '—'} />
              <Stat label="Peso objetivo" value={healthProfile?.weightGoalKg ? `${healthProfile.weightGoalKg} kg` : '—'} />
              <Stat label="FC reposo" value={healthProfile?.hrResting ? `${healthProfile.hrResting} bpm` : '—'} />
              <Stat
                label="Adherencia"
                value={
                  latestCheckIn?.dietAdherencePct != null
                    ? `${latestCheckIn.dietAdherencePct}%`
                    : '—'
                }
              />
              <Stat
                label="Plan"
                value={activePlan ? activePlan.name : 'Sin plan activo'}
              />
              <Stat
                label="Semanas"
                value={activePlan ? `${activePlan.weeks.length}/${activePlan.totalWeeks}` : '—'}
              />
              <Stat
                label="Último check-in"
                value={lastCheckInDaysAgo !== null ? `Hace ${lastCheckInDaysAgo} días` : 'Sin datos'}
              />
              <Stat label="Email" value={athlete.email} />
              {healthProfile?.sport && (
                <Stat label="Deporte" value={SPORT_LABELS[healthProfile.sport] ?? healthProfile.sport} />
              )}
              {healthProfile?.experienceLevel && (
                <Stat label="Nivel" value={
                  healthProfile.experienceLevel === 'BEGINNER' ? 'Principiante' :
                  healthProfile.experienceLevel === 'INTERMEDIATE' ? 'Intermedio' :
                  healthProfile.experienceLevel === 'ADVANCED' ? 'Avanzado' :
                  healthProfile.experienceLevel
                } />
              )}
              {healthProfile?.ftp != null && (
                <Stat label="FTP" value={`${healthProfile.ftp} W`} />
              )}
              {latestCheckIn && (
                <>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Estrés (últ.)</p>
                    <p className={`text-sm font-semibold ${latestCheckIn.stressLevel != null && latestCheckIn.stressLevel >= 7 ? 'text-red-600' : 'text-gray-800'}`}>
                      {latestCheckIn.stressLevel != null ? `${latestCheckIn.stressLevel}/10` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Motivación (últ.)</p>
                    <p className={`text-sm font-semibold ${latestCheckIn.motivationLevel != null && latestCheckIn.motivationLevel <= 3 ? 'text-red-600' : 'text-gray-800'}`}>
                      {latestCheckIn.motivationLevel != null ? `${latestCheckIn.motivationLevel}/10` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Dolor (últ.)</p>
                    <p className={`text-sm font-semibold ${latestCheckIn.painLevel != null && latestCheckIn.painLevel >= 5 ? 'text-red-600' : 'text-gray-800'}`}>
                      {latestCheckIn.painLevel != null ? `${latestCheckIn.painLevel}/10` : '—'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Activación */}
          {!activated && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-800">Cuenta pendiente de activación</p>
                <p className="text-xs text-amber-600 mt-0.5">El asesorado no tiene acceso al dashboard hasta que lo actives</p>
              </div>
              <button
                onClick={handleActivate}
                disabled={activating}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                {activating ? 'Activando...' : 'Activar cuenta'}
              </button>
            </div>
          )}

          {/* Reset contraseña */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Contraseña del asesorado</p>
                <p className="text-xs text-gray-500 mt-0.5">Genera una nueva contraseña temporal si el atleta perdió acceso</p>
              </div>
              <button
                onClick={handleResetPassword}
                disabled={resettingPwd}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
              >
                {resettingPwd ? 'Generando...' : 'Resetear contraseña'}
              </button>
            </div>
            {resetLink && (
              <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 shrink-0">Link de acceso:</span>
                <span className="text-xs text-[#1e3a5f] flex-1 truncate">Comparte este link con el atleta</span>
                <button
                  onClick={handleCopyPassword}
                  className="text-xs font-medium px-2 py-0.5 rounded transition-colors shrink-0"
                  style={pwdCopied ? { backgroundColor: '#dcfce7', color: '#15803d' } : { backgroundColor: '#f3f4f6', color: '#374151' }}
                >
                  {pwdCopied ? '✓ Copiado' : '📋'}
                </button>
              </div>
            )}
          </div>

          {/* Meta del coach + notas privadas */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Seguimiento del coach</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Meta pactada con el atleta</label>
              <input
                type="text"
                value={coachGoal}
                onChange={(e) => setCoachGoal(e.target.value)}
                placeholder="ej. Bajar 5 kg en 16 semanas, completar 10K en menos de 50 min"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notas privadas del coach <span className="text-gray-400">(el atleta no las ve)</span></label>
              <textarea
                rows={3}
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Observaciones internas, contexto personal, historial de lesiones..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveCoachNotes}
                disabled={savingCoachNotes}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                {savingCoachNotes ? 'Guardando...' : 'Guardar'}
              </button>
              {coachNotesSaved && <span className="text-sm text-green-600">✓ Guardado</span>}
            </div>
          </div>

          {/* Zonas FC */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Zonas de frecuencia cardíaca</h2>
            <div className="space-y-2">
              {zones.map((z, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: ['#93c5fd', '#4ade80', '#facc15', '#fb923c', '#f87171'][i] }}
                  />
                  <span className="text-gray-700 w-44">{z.label}</span>
                  <span className="text-gray-500 font-mono text-xs">
                    {z.min} – {z.max} bpm
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          {alerts.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <h2 className="font-semibold text-red-800 mb-3">Alertas activas</h2>
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <span>⚠</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acceso del atleta */}
          <AthleteFeatureToggles
            athleteId={athleteId}
            initialFeatures={initialFeatures}
          />

          {/* Últimos check-ins tabla */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
            <h2 className="font-semibold text-gray-900 mb-4">Últimos check-ins</h2>
            {checkInsSorted.length === 0 ? (
              <p className="text-sm text-gray-400">Sin check-ins registrados aún.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Semana</th>
                    <th className="pb-2 font-medium">Peso</th>
                    <th className="pb-2 font-medium">FC reposo</th>
                    <th className="pb-2 font-medium">Sueño</th>
                    <th className="pb-2 font-medium">Energía</th>
                    <th className="pb-2 font-medium">Estrés</th>
                    <th className="pb-2 font-medium">Motivación</th>
                    <th className="pb-2 font-medium">Adherencia</th>
                    <th className="pb-2 font-medium">RPE/Fatiga</th>
                    <th className="pb-2 font-medium">Dolor</th>
                    <th className="pb-2 font-medium">Ajustes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {checkInsSorted.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 font-medium text-gray-700">S{c.weekNumber}</td>
                      <td className="py-2.5 text-gray-600">{c.weightKg != null ? `${c.weightKg} kg` : '—'}</td>
                      <td className="py-2.5 text-gray-600">{c.hrResting != null ? `${c.hrResting} bpm` : '—'}</td>
                      <td className="py-2.5 text-gray-600">{c.sleepScore != null ? `${c.sleepScore}/100` : '—'}</td>
                      <td className="py-2.5 text-gray-600">{c.energyLevel != null ? `${c.energyLevel}/10` : '—'}</td>
                      <td className="py-2.5">
                        {c.stressLevel != null ? (
                          <span className={c.stressLevel >= 7 ? 'text-red-600 font-semibold' : c.stressLevel >= 4 ? 'text-amber-600' : 'text-gray-600'}>
                            {c.stressLevel}/10
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5">
                        {c.motivationLevel != null ? (
                          <span className={c.motivationLevel <= 3 ? 'text-red-600 font-semibold' : c.motivationLevel <= 6 ? 'text-amber-600' : 'text-green-600'}>
                            {c.motivationLevel}/10
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 text-gray-600">{c.dietAdherencePct != null ? `${c.dietAdherencePct}%` : '—'}</td>
                      <td className="py-2.5">
                        {c.hardestSessionRpe != null ? (
                          <span className={c.hardestSessionRpe >= 8 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                            {c.hardestSessionRpe}/10
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5">
                        {c.painLevel != null ? (
                          <span className={c.painLevel >= 5 ? 'text-red-600 font-semibold' : c.painLevel >= 3 ? 'text-amber-600' : 'text-gray-600'}>
                            {c.painLevel}/10
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5">
                        {c.adjustmentsTriggered.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                            {c.adjustmentsTriggered.length} ajuste{c.adjustmentsTriggered.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Log de ajustes automáticos */}
          {checkInsSorted.some((c) => c.adjustmentsTriggered.length > 0) && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
              <h2 className="font-semibold text-indigo-900 mb-3">Log de ajustes automáticos</h2>
              <p className="text-xs text-indigo-600 mb-4">
                El sistema ajustó el plan en base a los check-ins del atleta:
              </p>
              <ul className="space-y-3">
                {checkInsSorted
                  .filter((c) => c.adjustmentsTriggered.length > 0)
                  .map((c) => (
                    <li key={c.id} className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-indigo-700">Semana {c.weekNumber}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(c.recordedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.adjustmentsTriggered.map((adj, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800"
                          >
                            {adj}
                          </span>
                        ))}
                      </div>
                      {c.notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">&quot;{c.notes}&quot;</p>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Plan ─────────────────────────────────────────────────────────── */}
      {activeTab === 'Plan' && (
        <div className="space-y-6">
          {/* Plan CTAs */}
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/coach/athlete/${athleteId}/plan/build`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              🗓 Constructor visual
            </Link>
            {activePlan ? (
              <Link
                href={`/coach/plan/${activePlan.id}/review`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Revisar y aprobar →
              </Link>
            ) : (
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white opacity-40 cursor-not-allowed"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Revisar y aprobar →
              </span>
            )}
          </div>

          {!activePlan ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
              {!creatingPlan ? (
                <div className="text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin plan activo</h2>
                  <p className="text-gray-400 text-sm mb-5">Crea el plan de entrenamiento para este asesorado</p>
                  <button
                    onClick={() => setCreatingPlan(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    + Crear plan
                  </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-5">
                  <h2 className="font-semibold text-gray-900 text-lg">Crear plan de entrenamiento</h2>

                  {/* Mode toggle */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                    <button
                      onClick={() => setPlanMode('template')}
                      className="flex-1 py-2 font-medium transition-colors"
                      style={planMode === 'template' ? { backgroundColor: '#1e3a5f', color: '#fff' } : { color: '#6b7280', backgroundColor: '#fff' }}
                    >
                      Desde template
                    </button>
                    <button
                      onClick={() => { setPlanMode('copy'); if (availablePlans.length === 0) loadAvailablePlans() }}
                      className="flex-1 py-2 font-medium transition-colors border-l border-gray-200"
                      style={planMode === 'copy' ? { backgroundColor: '#1e3a5f', color: '#fff' } : { color: '#6b7280', backgroundColor: '#fff' }}
                    >
                      Copiar de otro atleta
                    </button>
                  </div>

                  {/* Perfil del atleta para referencia */}
                  {healthProfile && (
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 grid grid-cols-2 gap-2">
                      <span>Edad: <strong>{healthProfile.age} años</strong></span>
                      <span>Peso: <strong>{healthProfile.weightKg} kg</strong></span>
                      {healthProfile.hrResting && <span>FC reposo: <strong>{healthProfile.hrResting} bpm</strong></span>}
                      {healthProfile.injuries.length > 0 && (
                        <span className="col-span-2 text-amber-600">Lesiones: {healthProfile.injuries.join(', ')}</span>
                      )}
                    </div>
                  )}

                  {planMode === 'template' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo del plan</label>
                        <select
                          value={planGoalType}
                          onChange={(e) => setPlanGoalType(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                        >
                          <option value="RACE_5K">Carrera 5K (8 semanas)</option>
                          <option value="RACE_10K">Carrera 10K (12 semanas)</option>
                          <option value="STRENGTH_TRAINING">Entrenamiento de fuerza</option>
                          <option value="BODY_RECOMPOSITION">Recomposición corporal (16 semanas)</option>
                          <option value="WEIGHT_LOSS">Pérdida de peso</option>
                          <option value="GENERAL_FITNESS">Condición general</option>
                        </select>
                        {TEMPLATE_PREVIEW[planGoalType] && (() => {
                          const info = TEMPLATE_PREVIEW[planGoalType]
                          return (
                            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-semibold text-[#1e3a5f]">{info.weeks} semanas</span>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-600 text-xs">{info.description}</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {info.phases.map(p => (
                                  <span key={p} className="text-[10px] px-2 py-0.5 bg-white border border-blue-100 rounded-full text-[#1e3a5f] font-medium">{p}</span>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Días de entrenamiento por semana</label>
                        <select
                          value={planDaysPerWeek}
                          onChange={(e) => setPlanDaysPerWeek(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                        >
                          {[3, 4, 5, 6].map((d) => (
                            <option key={d} value={d}>{d} días</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {loadingPlans ? (
                        <p className="text-sm text-gray-400 text-center py-4">Cargando planes disponibles...</p>
                      ) : availablePlans.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                          No hay planes de otros atletas disponibles para copiar.
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan de origen</label>
                            <select
                              value={copySourcePlanId}
                              onChange={(e) => setCopySourcePlanId(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                            >
                              {availablePlans.map((p) => (
                                <option key={p.planId} value={p.planId}>
                                  {p.athleteName} — {p.planName} ({p.totalWeeks} sem{p.status === 'ACTIVE' ? ' · activo' : ''})
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">El plan se copiará exactamente con las mismas sesiones, ajustando las fechas al nuevo inicio.</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                            <input
                              type="date"
                              value={copyStartDate}
                              onChange={(e) => setCopyStartDate(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {planError && <p className="text-sm text-red-500">{planError}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCreatingPlan(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={planMode === 'template' ? handleCreatePlan : handleCopyPlan}
                      disabled={planGenerating || (planMode === 'copy' && (!copySourcePlanId || availablePlans.length === 0))}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#1e3a5f' }}
                    >
                      {planGenerating ? 'Generando...' : planMode === 'template' ? 'Generar plan' : 'Copiar plan →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (() => {
              const week = activePlan.weeks[planViewWeekIdx]
              const load = weekLoadScore(week.sessions)
              const prevLoad = planViewWeekIdx > 0 ? weekLoadScore(activePlan.weeks[planViewWeekIdx - 1].sessions) : null
              const overload = prevLoad !== null && prevLoad > 0 && (load - prevLoad) / prevLoad > 0.20
              return (
              <>
              {/* Week navigation */}
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <button
                  onClick={() => setPlanViewWeekIdx(i => Math.max(0, i - 1))}
                  disabled={planViewWeekIdx === 0}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#1e3a5f]">Semana {week.weekNumber} de {activePlan.totalWeeks}</p>
                  <p className="text-xs text-gray-400">{week.phase}</p>
                </div>
                <button
                  onClick={() => setPlanViewWeekIdx(i => Math.min(activePlan.weeks.length - 1, i + 1))}
                  disabled={planViewWeekIdx === activePlan.weeks.length - 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
              <div key={week.weekNumber} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="font-semibold" style={{ color: '#1e3a5f' }}>
                    {week.phase} — semana {week.weekNumber}
                  </h2>
                  {week.isRecoveryWeek && (
                    <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Recuperación
                    </span>
                  )}
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    Carga: {load} pts
                  </span>
                  {overload && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      ⚠ +{Math.round(((load - prevLoad!) / prevLoad!) * 100)}% vs sem anterior
                    </span>
                  )}
                </div>
                {week.focusDescription && (
                  <p className="text-xs text-gray-500 mb-3">{week.focusDescription}</p>
                )}
                <div className="space-y-4">
                  {week.sessions.map((session) => (
                    <div key={session.id} className="border-l-2 pl-4" style={{ borderColor: '#ea580c' }}>
                      {editingSession === session.id ? (
                        // ── Inline editor ──
                        <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-semibold text-blue-700 mb-2">
                            Editar — {DAY_NAMES[session.dayOfWeek]}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                              <select
                                value={sessionDraft.type}
                                onChange={(e) => setSessionDraft(d => ({ ...d, type: e.target.value }))}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                              >
                                {Object.entries(SESSION_TYPE_LABELS).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Duración (min)</label>
                              <input
                                type="number"
                                value={sessionDraft.durationMin}
                                onChange={(e) => setSessionDraft(d => ({ ...d, durationMin: Number(e.target.value) }))}
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Zona objetivo</label>
                            <input
                              type="text"
                              value={sessionDraft.zoneTarget}
                              onChange={(e) => setSessionDraft(d => ({ ...d, zoneTarget: e.target.value }))}
                              placeholder="ej. Z2, Z3-4, 75-85% FCmax"
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                            <textarea
                              rows={2}
                              value={sessionDraft.detailText}
                              onChange={(e) => setSessionDraft(d => ({ ...d, detailText: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              Estructura de bloques
                              <span className="ml-1 text-gray-400 font-normal">(zona|duración|descripción — una por línea)</span>
                            </label>
                            <textarea
                              rows={3}
                              value={sessionDraft.structure}
                              onChange={(e) => setSessionDraft(d => ({ ...d, structure: e.target.value }))}
                              placeholder={'Z2|20min|Calentamiento\nZ4|2×10min|Intervalos\nZ1|10min|Vuelta calma'}
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setEditingSession(null)}
                              className="flex-1 text-xs border border-gray-200 rounded-lg py-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveSession(session.id)}
                              disabled={savingSession}
                              className="flex-1 text-xs text-white rounded-lg py-1.5 font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                              style={{ backgroundColor: '#1e3a5f' }}
                            >
                              {savingSession ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // ── View mode ──
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase">
                              {DAY_NAMES[session.dayOfWeek] ?? `Día ${session.dayOfWeek}`}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {SESSION_TYPE_LABELS[session.type] ?? session.type}
                            </span>
                            <span className="text-xs text-gray-400">{session.durationMin} min</span>
                            <button
                              onClick={() => {
                                setSessionDraft({
                                  durationMin: session.durationMin,
                                  type: session.type,
                                  zoneTarget: session.zoneTarget ?? '',
                                  detailText: session.detailText ?? '',
                                  structure: session.structure ?? '',
                                })
                                setEditingSession(session.id)
                              }}
                              className="ml-auto text-xs text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              Editar
                            </button>
                          </div>
                          {session.detailText && (
                            <p className="text-xs text-gray-500 mb-2">{session.detailText}</p>
                          )}
                          {session.structure && (
                            <div className="mb-2 space-y-0.5">
                              {session.structure.split('\n').filter(Boolean).map((block, bi) => {
                                const [zone, dur, desc] = block.split('|')
                                return (
                                  <p key={bi} className="text-xs text-gray-600 font-mono">
                                    {zone && <span className="text-indigo-600 font-semibold">{zone}</span>}
                                    {dur && <span className="text-gray-400"> · {dur}</span>}
                                    {desc && <span className="text-gray-500"> — {desc}</span>}
                                  </p>
                                )
                              })}
                            </div>
                          )}
                          {session.zoneTarget && (
                            <p className="text-xs text-blue-600 mb-2">Zona: {session.zoneTarget}</p>
                          )}
                          <div className="flex gap-2 items-start">
                            <textarea
                              rows={2}
                              placeholder="Nota del coach..."
                              value={notes[session.id] ?? ''}
                              onChange={(e) => handleNoteChange(session.id, e.target.value)}
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-700 placeholder-gray-300"
                            />
                            <button
                              onClick={() => handleSaveNote(session.id)}
                              disabled={savingNotes[session.id]}
                              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                              style={{ backgroundColor: savedNotes[session.id] ? '#16a34a' : '#1e3a5f' }}
                            >
                              {savingNotes[session.id] ? '...' : savedNotes[session.id] ? '✓ Guardado' : 'Guardar'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {week.sessions.length === 0 && (
                    <p className="text-xs text-gray-400">Sin sesiones planificadas para esta semana</p>
                  )}
                </div>
              </div>
            </>
            )
          })()}
        </div>
      )}

      {/* ── Tab: Progreso ─────────────────────────────────────────────────────── */}
      {activeTab === 'Progreso' && (
        <div className="space-y-6">
          {checkInsSorted.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">📊</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin datos de progreso</h2>
              <p className="text-gray-400 text-sm">El atleta aún no ha completado check-ins</p>
            </div>
          ) : (
            <>
              {/* Tabla de check-ins */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
                <h2 className="font-semibold text-gray-900 mb-4">Historial de check-ins</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">Semana</th>
                      <th className="pb-2 font-medium">Peso (kg)</th>
                      <th className="pb-2 font-medium">FC reposo</th>
                      <th className="pb-2 font-medium">Sueño</th>
                      <th className="pb-2 font-medium">Energía</th>
                      <th className="pb-2 font-medium">Estrés</th>
                      <th className="pb-2 font-medium">Motivación</th>
                      <th className="pb-2 font-medium">Dolor</th>
                      <th className="pb-2 font-medium">Cintura</th>
                      <th className="pb-2 font-medium">Brazos</th>
                      <th className="pb-2 font-medium">Cadera</th>
                      <th className="pb-2 font-medium">Muslos</th>
                      <th className="pb-2 font-medium">Adherencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {checkInsSorted.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 font-medium text-gray-700">S{c.weekNumber}</td>
                        <td className="py-2.5 text-gray-600">{c.weightKg ?? '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.hrResting ?? '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.sleepScore ?? '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.energyLevel ?? '—'}</td>
                        <td className="py-2.5">
                          {c.stressLevel != null ? (
                            <span className={c.stressLevel >= 7 ? 'text-red-600 font-semibold' : c.stressLevel >= 4 ? 'text-amber-600' : 'text-gray-600'}>
                              {c.stressLevel}/10
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5">
                          {c.motivationLevel != null ? (
                            <span className={c.motivationLevel <= 3 ? 'text-red-600 font-semibold' : c.motivationLevel <= 6 ? 'text-amber-600' : 'text-green-600'}>
                              {c.motivationLevel}/10
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5">
                          {c.painLevel != null ? (
                            <span className={c.painLevel >= 5 ? 'text-red-600 font-semibold' : c.painLevel >= 3 ? 'text-amber-600' : 'text-gray-600'}>
                              {c.painLevel}/10
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 text-gray-600">{c.waistCm != null ? `${c.waistCm} cm` : '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.armsCm != null ? `${c.armsCm} cm` : '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.hipsCm != null ? `${c.hipsCm} cm` : '—'}</td>
                        <td className="py-2.5 text-gray-600">{c.thighsCm != null ? `${c.thighsCm} cm` : '—'}</td>
                        <td className="py-2.5 text-gray-600">
                          {c.dietAdherencePct != null ? `${c.dietAdherencePct}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Curva de peso */}
              {weights.length > 1 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-5">Curva de peso</h2>
                  <div className="flex items-end gap-4 h-28">
                    {checkInsSorted
                      .filter((c) => c.weightKg !== null)
                      .map((c, idx, arr) => {
                        const range = maxWeight - minWeight || 1
                        const heightPct = (((c.weightKg as number) - minWeight) / range) * 70 + 30
                        return (
                          <div key={c.id} className="flex flex-col items-center gap-1 flex-1">
                            <span className="text-xs text-gray-500 font-mono">{c.weightKg}</span>
                            <div
                              className="w-full rounded-t-md transition-all"
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: '#1e3a5f',
                                opacity: 0.7 + (idx / arr.length) * 0.3,
                              }}
                            />
                            <span className="text-xs text-gray-400">S{c.weekNumber}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Circunferencias corporales */}
              {checkInsSorted.some((c) => c.waistCm !== null || c.armsCm !== null || c.hipsCm !== null || c.thighsCm !== null) && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-4">Circunferencias corporales</h2>
                  <div className="space-y-5">
                    {([
                      { key: 'waistCm' as const, label: 'Cintura', color: '#6366f1' },
                      { key: 'armsCm'  as const, label: 'Brazos',  color: '#ea580c' },
                      { key: 'hipsCm'  as const, label: 'Cadera',  color: '#ec4899' },
                      { key: 'thighsCm' as const, label: 'Muslos', color: '#14b8a6' },
                    ]).map(({ key, label, color }) => {
                      const pts = checkInsSorted.filter(c => c[key] !== null)
                      if (pts.length === 0) return null
                      const latest = pts[pts.length - 1][key] as number
                      const first  = pts[0][key] as number
                      const delta  = +(latest - first).toFixed(1)
                      const maxVal = Math.max(...pts.map(p => p[key] as number))
                      const minVal = Math.min(...pts.map(p => p[key] as number))
                      const range  = maxVal - minVal || 1
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                            <div className="flex items-center gap-2">
                              {delta !== 0 && (
                                <span className={`text-xs font-semibold ${delta < 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {delta > 0 ? '+' : ''}{delta} cm
                                </span>
                              )}
                              <span className="text-sm font-bold" style={{ color }}>{latest} cm</span>
                            </div>
                          </div>
                          <div className="flex items-end gap-1" style={{ height: 36 }}>
                            {pts.map((c, idx) => {
                              const heightPct = 25 + ((c[key] as number - minVal) / range) * 75
                              return (
                                <div key={c.id} title={`S${c.weekNumber}: ${c[key]} cm`} className="flex-1 rounded-t-sm transition-all" style={{ height: `${heightPct}%`, backgroundColor: color, opacity: 0.55 + (idx / pts.length) * 0.45 }} />
                              )
                            })}
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            {pts.map(c => (
                              <div key={c.id} className="flex-1 text-center">
                                <span className="text-[9px] text-gray-400">S{c.weekNumber}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Adherencia */}
              {checkInsSorted.some((c) => c.dietAdherencePct !== null) && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-5">Adherencia semanal</h2>
                  <div className="space-y-3">
                    {checkInsSorted
                      .filter((c) => c.dietAdherencePct !== null)
                      .map((c) => (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-6">S{c.weekNumber}</span>
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${c.dietAdherencePct}%`,
                                backgroundColor:
                                  (c.dietAdherencePct ?? 0) >= 70
                                    ? '#16a34a'
                                    : (c.dietAdherencePct ?? 0) >= 40
                                    ? '#d97706'
                                    : '#dc2626',
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-9 text-right">
                            {c.dietAdherencePct}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Nutrición ────────────────────────────────────────────────────── */}
      {activeTab === 'Nutrición' && (
        <div className="space-y-6">
          {!nutritionPlan ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-4">🥗</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Sin plan nutricional</h2>
              <p className="text-gray-400 text-sm">El atleta aún no tiene un plan nutricional generado</p>
            </div>
          ) : (
            <>
              {/* TDEE & targets */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Targets calóricos</h2>
                  {!editingNutrition && (
                    <button
                      onClick={() => { setNutritionDraft(nutritionPlan); setEditingNutrition(true) }}
                      className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>
                {editingNutrition && nutritionDraft ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'tdee', label: 'TDEE base (kcal)' },
                        { key: 'targetKcalHard', label: 'Día duro (kcal)' },
                        { key: 'targetKcalEasy', label: 'Día fácil (kcal)' },
                        { key: 'targetKcalRest', label: 'Día descanso (kcal)' },
                        { key: 'proteinG', label: 'Proteína (g)' },
                        { key: 'carbsHardG', label: 'Carbs duro (g)' },
                        { key: 'carbsEasyG', label: 'Carbs fácil (g)' },
                        { key: 'fatG', label: 'Grasas (g)' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label}</label>
                          <input
                            type="number"
                            min={0}
                            value={(nutritionDraft as Record<string, number>)[key] ?? ''}
                            onChange={(e) => setNutritionDraft((prev) => prev ? { ...prev, [key]: Number(e.target.value) } : prev)}
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setEditingNutrition(false)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveNutrition}
                        disabled={savingNutrition}
                        className="flex-1 px-3 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 transition-opacity"
                        style={{ backgroundColor: '#1e3a5f' }}
                      >
                        {savingNutrition ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                    {nutritionSaveError && (
                      <p className="text-xs text-red-600 mt-2">{nutritionSaveError}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <Stat label="TDEE base" value={`${nutritionPlan.tdee} kcal`} />
                      <Stat label="Día duro" value={`${nutritionPlan.targetKcalHard} kcal`} />
                      <Stat label="Día fácil" value={`${nutritionPlan.targetKcalEasy} kcal`} />
                      <Stat label="Día descanso" value={`${nutritionPlan.targetKcalRest} kcal`} />
                    </div>

                    {/* Phase-based target suggestion */}
                    {currentPhase && PHASE_KCAL_DELTA[currentPhase] && (() => {
                      const phaseInfo = PHASE_KCAL_DELTA[currentPhase]
                      const delta = phaseInfo.delta
                      const recHard = nutritionPlan.tdee + delta + 300
                      const recEasy = nutritionPlan.tdee + delta
                      const recRest = nutritionPlan.tdee + delta - 200
                      const alreadyApplied =
                        Math.abs(nutritionPlan.targetKcalHard - recHard) < 80 &&
                        Math.abs(nutritionPlan.targetKcalEasy - recEasy) < 80
                      return (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                              Fase actual: <span style={{ color: '#1e3a5f' }}>{phaseInfo.label}</span>
                            </p>
                            <p className="text-xs text-gray-400">
                              {phaseInfo.desc} · Duro: <strong className="text-gray-700">{recHard} kcal</strong>
                              {' '}· Fácil: <strong className="text-gray-700">{recEasy} kcal</strong>
                              {' '}· Descanso: <strong className="text-gray-700">{recRest} kcal</strong>
                            </p>
                          </div>
                          {alreadyApplied ? (
                            <span className="text-xs font-medium text-green-600 shrink-0">✓ Targets de fase aplicados</span>
                          ) : (
                            <button
                              onClick={applyPhaseTargets}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors shrink-0"
                            >
                              Aplicar targets de fase
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>

              {/* Macros — solo en modo vista */}
              {!editingNutrition && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-4">Macronutrientes</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <Stat label="Proteína" value={`${nutritionPlan.proteinG} g`} />
                    <Stat label="Carbs (duro)" value={`${nutritionPlan.carbsHardG} g`} />
                    <Stat label="Carbs (fácil)" value={`${nutritionPlan.carbsEasyG} g`} />
                    <Stat label="Grasas" value={`${nutritionPlan.fatG} g`} />
                  </div>
                </div>
              )}

              {/* Context */}
              {healthProfile && !editingNutrition && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-sm text-gray-600">
                  <p>
                    Calculado para{' '}
                    <strong>{healthProfile.weightKg} kg</strong>
                    {healthProfile.weightGoalKg && (
                      <> con objetivo de <strong>{healthProfile.weightGoalKg} kg</strong></>
                    )}
                    {activePlan && <>, durante el plan <strong>{activePlan.name}</strong></>}.
                  </p>
                </div>
              )}

              {/* Food Profile */}
              {!editingNutrition && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-4">Perfil alimenticio</h2>
                  {!nutritionExtLoaded ? (
                    <p className="text-sm text-gray-400">Cargando...</p>
                  ) : !foodProfile ? (
                    <p className="text-sm text-gray-400">El atleta aún no ha configurado sus preferencias alimenticias.</p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 w-32 shrink-0">Comidas/día</span>
                        <span className="font-medium text-gray-900">{foodProfile.mealsPerDay}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 w-32 shrink-0">Pesa alimentos</span>
                        <span className="font-medium text-gray-900">{foodProfile.weighsFood ? 'Sí' : 'No'}</span>
                      </div>
                      {foodProfile.availableFoods.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 w-32 shrink-0">Alimentos</span>
                          <div className="flex flex-wrap gap-1">
                            {foodProfile.availableFoods.map(f => (
                              <span key={f} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {foodProfile.restrictions.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 w-32 shrink-0">Restricciones</span>
                          <div className="flex flex-wrap gap-1">
                            {foodProfile.restrictions.map(r => (
                              <span key={r} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {foodProfile.notes && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 w-32 shrink-0">Notas</span>
                          <span className="text-gray-700">{foodProfile.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Logs de alimentos — últimos 7 días */}
              {!editingNutrition && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-semibold text-gray-900 mb-4">Registro alimenticio — últimos 7 días</h2>
                  {!nutritionExtLoaded ? (
                    <p className="text-sm text-gray-400">Cargando...</p>
                  ) : foodLogs.length === 0 ? (
                    <p className="text-sm text-gray-400">El atleta no ha registrado alimentos en los últimos 7 días.</p>
                  ) : (() => {
                    // Agrupar por fecha y sumar macros
                    const byDate = new Map<string, { kcal: number; protein: number; carbs: number; fat: number; items: number }>()
                    for (const log of foodLogs) {
                      const dateKey = log.date.slice(0, 10)
                      const prev = byDate.get(dateKey) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, items: 0 }
                      byDate.set(dateKey, {
                        kcal:    prev.kcal    + (log.kcalLogged    ?? 0),
                        protein: prev.protein + (log.proteinLogged ?? 0),
                        carbs:   prev.carbs   + (log.carbsLogged   ?? 0),
                        fat:     prev.fat     + (log.fatLogged     ?? 0),
                        items:   prev.items   + 1,
                      })
                    }
                    const avgTargetKcal = nutritionPlan
                      ? Math.round((nutritionPlan.targetKcalHard + nutritionPlan.targetKcalEasy + nutritionPlan.targetKcalRest) / 3)
                      : null

                    return (
                      <div className="space-y-2">
                        {Array.from(byDate.entries())
                          .sort((a, b) => b[0].localeCompare(a[0]))
                          .map(([dateKey, totals]) => {
                            const pct = avgTargetKcal && totals.kcal > 0
                              ? Math.round((totals.kcal / avgTargetKcal) * 100)
                              : null
                            const color = pct == null ? '#9ca3af' : pct >= 90 ? '#16a34a' : pct >= 70 ? '#ea580c' : '#dc2626'
                            return (
                              <div key={dateKey} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                <span className="text-xs text-gray-400 w-20 shrink-0">
                                  {new Date(dateKey + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </span>
                                <div className="flex-1 flex items-center gap-3 flex-wrap text-xs">
                                  <span className="font-semibold" style={{ color }}>
                                    {Math.round(totals.kcal)} kcal
                                    {pct != null && <span className="text-gray-400 font-normal ml-1">({pct}%)</span>}
                                  </span>
                                  <span className="text-gray-500">P: {Math.round(totals.protein)}g</span>
                                  <span className="text-gray-500">C: {Math.round(totals.carbs)}g</span>
                                  <span className="text-gray-500">G: {Math.round(totals.fat)}g</span>
                                  <span className="text-gray-400">{totals.items} registros</span>
                                </div>
                              </div>
                            )
                          })
                        }
                        {avgTargetKcal && (
                          <p className="text-xs text-gray-400 pt-1">
                            Target promedio: {avgTargetKcal} kcal/día
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Constructor de plan de comidas */}
              {!editingNutrition && nutritionExtLoaded && nutritionPlan && (
                <NutritionConstructor
                  athleteId={athleteId}
                  nutritionPlan={nutritionPlan}
                  athleteFoods={athleteFoods}
                  initialMealPlan={(mealPlan?.data as Parameters<typeof NutritionConstructor>[0]['initialMealPlan']) ?? null}
                />
              )}
              {!editingNutrition && !nutritionExtLoaded && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <p className="text-sm text-gray-400">Cargando plan de comidas...</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Gym ──────────────────────────────────────────────────────────── */}
      {activeTab === 'Sesiones' && (
        <div className="space-y-5">
          {gymLoading && (
            <div className="text-center py-16 text-gray-400 text-sm">Cargando logs de gym...</div>
          )}

          {!gymLoading && gymLogs.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">🏋️</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin sesiones registradas</h2>
              <p className="text-gray-400 text-sm">El atleta aún no ha completado sesiones de gym</p>
            </div>
          )}

          {!gymLoading &&
            gymLogs.map((ex) => {
              const maxGymWeight = Math.max(
                1,
                ...ex.logs.flatMap((l) => l.sets.map((s) => s.weightKg ?? 0))
              )

              return (
                <div key={ex.exerciseId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ex.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ex.muscleGroups.slice(0, 3).map((mg) => (
                          <span
                            key={mg}
                            className="text-[10px] font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-1.5 py-0.5 rounded-full"
                          >
                            {mg}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {ex.logs.length} sesión{ex.logs.length !== 1 ? 'es' : ''}
                    </span>
                  </div>

                  {/* Mini bar chart */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Peso máximo por sesión (kg)</p>
                    <div className="flex items-end gap-1.5 h-16">
                      {ex.logs.map((log, li) => {
                        const sessionMax = Math.max(0, ...log.sets.map((s) => s.weightKg ?? 0))
                        const heightPct = maxGymWeight > 0 ? (sessionMax / maxGymWeight) * 100 : 0
                        return (
                          <div key={li} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                            <span className="text-[9px] text-gray-400 font-mono truncate w-full text-center">
                              {sessionMax > 0 ? `${sessionMax}` : '—'}
                            </span>
                            <div
                              className="w-full rounded-t-sm transition-all"
                              style={{
                                height: `${Math.max(heightPct, 4)}%`,
                                backgroundColor: '#ea580c',
                                opacity: 0.5 + (li / ex.logs.length) * 0.5,
                              }}
                            />
                            <span className="text-[8px] text-gray-300 truncate w-full text-center">
                              {log.date.slice(5)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Last session detail */}
                  {ex.logs.length > 0 &&
                    (() => {
                      const last = ex.logs[ex.logs.length - 1]
                      return (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Última sesión — {last.date}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {last.sets.map((s) => (
                              <div
                                key={s.setNumber}
                                className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
                              >
                                <span className="font-bold text-[#1e3a5f] w-4 text-center">
                                  {s.setNumber}
                                </span>
                                <span className="text-gray-500">
                                  {s.weightKg != null ? `${s.weightKg} kg` : '—'} ×{' '}
                                  {s.repsCompleted ?? '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                </div>
              )
            })}
        </div>
      )}

      {/* ── Tab: Benchmarks ───────────────────────────────────────────────────── */}
      {activeTab === 'Benchmarks' && (
        <div className="space-y-5">
          {/* Header + add button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Tests de rendimiento</h2>
              <p className="text-xs text-gray-400 mt-0.5">Registra PBs, FTP, 1RM y otros marcadores del atleta</p>
            </div>
            <button
              onClick={() => setShowBenchmarkForm(!showBenchmarkForm)}
              className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              {showBenchmarkForm ? 'Cancelar' : '+ Registrar test'}
            </button>
          </div>

          {/* Add form */}
          {showBenchmarkForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nuevo benchmark</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Sport */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Deporte</label>
                  <select
                    value={benchmarkSport}
                    onChange={e => { setBenchmarkSport(e.target.value); setBenchmarkMetric(METRIC_OPTIONS[e.target.value]?.[0]?.metric ?? '') }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  >
                    {Object.entries(SPORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                {/* Metric */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Métrica</label>
                  <select
                    value={benchmarkMetric}
                    onChange={e => setBenchmarkMetric(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  >
                    {(METRIC_OPTIONS[benchmarkSport] ?? []).map(m => (
                      <option key={m.metric} value={m.metric}>{METRIC_LABELS[m.metric] ?? m.metric}</option>
                    ))}
                  </select>
                </div>
                {/* Value */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Valor {METRIC_OPTIONS[benchmarkSport]?.find(m => m.metric === benchmarkMetric)?.unit === 'seconds'
                      ? '(MM:SS o HH:MM:SS)' : METRIC_OPTIONS[benchmarkSport]?.find(m => m.metric === benchmarkMetric)?.unit === 'watts' ? '(vatios)' : '(kg)'}
                  </label>
                  <input
                    type="text"
                    value={benchmarkValueStr}
                    onChange={e => setBenchmarkValueStr(e.target.value)}
                    placeholder={METRIC_OPTIONS[benchmarkSport]?.find(m => m.metric === benchmarkMetric)?.unit === 'seconds' ? '25:30' : '0'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  />
                </div>
                {/* Date */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Fecha del test</label>
                  <input
                    type="date"
                    value={benchmarkDate}
                    onChange={e => setBenchmarkDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Notas (opcional)</label>
                <input
                  type="text"
                  value={benchmarkNotes}
                  onChange={e => setBenchmarkNotes(e.target.value)}
                  placeholder="Ej: pista oficial, altitud 1600m"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddBenchmark}
                  disabled={savingBenchmark || !benchmarkValueStr}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#ea580c' }}
                >
                  {savingBenchmark ? 'Guardando...' : 'Guardar benchmark'}
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {benchmarksLoading && <div className="text-center py-16 text-gray-400 text-sm">Cargando benchmarks...</div>}

          {/* Empty */}
          {!benchmarksLoading && benchmarks.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-10 text-center shadow-sm">
              <div className="text-4xl mb-3">📊</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin benchmarks</h2>
              <p className="text-gray-400 text-sm">Registra los primeros tests del atleta para hacer seguimiento de su rendimiento</p>
            </div>
          )}

          {/* Benchmarks grouped by sport */}
          {!benchmarksLoading && benchmarks.length > 0 && (() => {
            const grouped: Record<string, BenchmarkItem[]> = {}
            for (const b of benchmarks) {
              if (!grouped[b.sport]) grouped[b.sport] = []
              grouped[b.sport].push(b)
            }
            return Object.entries(grouped).map(([sport, items]) => (
              <div key={sport} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700">{SPORT_LABELS[sport] ?? sport}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(b => (
                    <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {METRIC_LABELS[b.metric] ?? b.metric}
                          </span>
                          <span className="text-base font-black text-[#ea580c]">
                            {formatBenchmarkValue(b.value, b.unit, b.metric)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">
                            {new Date(b.testedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {b.notes && <span className="text-xs text-gray-400">· {b.notes}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBenchmark(b.id)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      {/* ── Tab: Gym ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Ejercicios' && (
        <div className="space-y-5">
          {gymAssignedLoading && (
            <div className="text-center py-16 text-gray-400 text-sm">Cargando rutina...</div>
          )}

          {!gymAssignedLoading && !gymAssigned.assignment && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">🏋️</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin rutina asignada</h2>
              <p className="text-gray-400 text-sm mb-4">El atleta no tiene una rutina activa</p>
              <a
                href={`/coach/gym`}
                className="inline-block px-5 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Ir a mis rutinas
              </a>
            </div>
          )}

          {!gymAssignedLoading && gymAssigned.assignment && (() => {
            const { assignment, recentSessions, runningSessions } = gymAssigned
            const { template } = assignment
            const DOW_LABELS: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' }
            const HARD_SESSIONS = new Set(['TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'FARTLEK', 'TEST', 'SIMULACRO'])
            return (
              <>
                {/* Template card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Rutina activa</p>
                      <h2 className="text-lg font-bold text-gray-900">{template.name}</h2>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {template.goal && (
                          <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium">{template.goal}</span>
                        )}
                        {template.level && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{template.level}</span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{template.daysPerWeek}d/semana</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={`/coach/gym/routines/${template.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
                      >
                        Modificar
                      </a>
                      <a
                        href={`/coach/gym`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#1e3a5f' }}
                      >
                        Asignar otra
                      </a>
                    </div>
                  </div>

                  {/* Days overview */}
                  <div className="space-y-2">
                    {template.days.map(day => {
                      const runSession = runningSessions[day.dayOfWeek]
                      const hasConflict = !day.isRestDay && runSession && HARD_SESSIONS.has(runSession.type)
                      return (
                      <div key={day.id} className={`flex items-start gap-3 py-2 border-t first:border-t-0 ${hasConflict ? 'border-orange-100 bg-orange-50/40 rounded-lg px-2 -mx-2' : 'border-gray-50'}`}>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                          style={day.isRestDay
                            ? { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                            : { backgroundColor: '#1e3a5f', color: 'white' }}
                        >
                          {DOW_LABELS[day.dayOfWeek] ?? day.dayOfWeek}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-800">{day.label}</p>
                            {hasConflict && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                ! Doble carga
                              </span>
                            )}
                          </div>
                          {day.isRestDay ? (
                            <p className="text-xs text-gray-400">Descanso gym</p>
                          ) : (
                            <p className="text-xs text-gray-500 truncate">
                              {day.exercises.map(e => e.exercise.name).join(' · ')}
                            </p>
                          )}
                          {runSession && (
                            <p className={`text-xs mt-0.5 font-medium ${hasConflict ? 'text-orange-600' : 'text-blue-500'}`}>
                              Running: {runSession.type.replace(/_/g, ' ')} {runSession.durationMin}min
                            </p>
                          )}
                          {!runSession && !day.isRestDay && (
                            <p className="text-xs text-green-600 mt-0.5">Sin running este dia</p>
                          )}
                        </div>
                        {!day.isRestDay && (
                          <span className="text-xs text-gray-400 shrink-0">{day.exercises.length} ejerc.</span>
                        )}
                      </div>
                    )})}

                  </div>

                  {assignment.notes && (
                    <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">{assignment.notes}</p>
                  )}
                </div>

                {/* Recent sessions */}
                {recentSessions.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-700">Últimas sesiones</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {recentSessions.map(s => (
                        <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ backgroundColor: '#1e3a5f', color: 'white' }}
                            >
                              {DOW_LABELS[s.dayOfWeek] ?? s.dayOfWeek}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-gray-800">{s.date}</p>
                                {s.source === 'plan' && (
                                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                    Plan
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {s.label ?? (s.durationMin != null ? `${s.durationMin} min` : null)}
                                {s.label && s.durationMin != null && ` · ${s.durationMin} min`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.overridesCount > 0 && (
                              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                                {s.overridesCount} cambio{s.overridesCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {s.rpe != null && (
                              <span
                                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: s.rpe >= 8 ? '#fef2f2' : s.rpe >= 6 ? '#fff7ed' : '#f0fdf4',
                                  color: s.rpe >= 8 ? '#dc2626' : s.rpe >= 6 ? '#ea580c' : '#16a34a',
                                }}
                              >
                                RPE {s.rpe}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recentSessions.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
                    <p className="text-sm text-gray-400">El atleta aún no ha completado sesiones de gym</p>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* ── Tab: Mensajes ─────────────────────────────────────────────────────── */}
      {activeTab === 'Mensajes' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ height: 520 }}>
          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!msgsLoaded && (
              <p className="text-center text-sm text-gray-400 pt-8">Cargando mensajes...</p>
            )}
            {msgsLoaded && msgs.length === 0 && (
              <p className="text-center text-sm text-gray-400 pt-8">Aún no hay mensajes. Escribe el primero.</p>
            )}
            {msgs.map(m => {
              const isCoach = m.fromId !== athleteId
              return (
                <div key={m.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isCoach
                        ? 'text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                    style={isCoach ? { backgroundColor: '#1e3a5f' } : {}}
                  >
                    <p>{m.content}</p>
                    <p className={`text-[10px] mt-1 ${isCoach ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                      {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {new Date(m.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <input
              type="text"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Escribe un mensaje..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
            <button
              onClick={handleSendMessage}
              disabled={!msgInput.trim() || msgSending}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}
