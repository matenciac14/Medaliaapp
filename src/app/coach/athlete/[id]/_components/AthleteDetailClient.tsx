'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getInitialWeekIdx } from '@/lib/core/week-number'
import Link from 'next/link'
import { FoodLogsSection, type FoodLogEntry } from './FoodLogsSection'
import { type DayAdherence } from './NutritionAdherenceCard'
import ResumenTab from './tabs/ResumenTab'
import PlanTab from './tabs/PlanTab'
import ProgresoTab from './tabs/ProgresoTab'
import NutricionTab from './tabs/NutricionTab'
import SesionesTab from './tabs/SesionesTab'
import AdherenciaTab from './tabs/AdherenciaTab'
import BenchmarksTab from './tabs/BenchmarksTab'
import EjerciciosTab from './tabs/EjerciciosTab'
import MensajesTab from './tabs/MensajesTab'

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

// ─── Local types (not exported — used for state only) ────────────────────────

type GymExerciseLog = {
  exerciseId: string; name: string; bodyPart: string; muscleGroups: string[]
  logs: { date: string; sets: { setNumber: number; weightKg: number | null; repsCompleted: number | null; isPR: boolean; setLogType: string }[] }[]
}

type RunningLog = {
  id: string; date: string; discipline: string
  durationMin: number | null; distanceKm: number | null; avgPaceSecPerKm: number | null
  hrAvg: number | null; hrMax: number | null; rpe: number | null
  notes: string | null; sessionLabel: string | null; intensity: string | null
}

type GymPR = {
  exerciseName: string; bodyPart: string; weightKg: number; repsCompleted: number; estimated1RM: number; achievedAt: string
}

type AdherenceWeek = {
  weekStart: string; weekLabel: string; completed: number; planned: number | null; pct: number | null
}

type BenchmarkItem = {
  id: string; userId: string; coachId: string | null
  sport: string; metric: string; value: number; unit: string
  testedAt: string; notes: string | null; createdAt: string
}

type DailyLogEntry = { date: string; weightKg: number | null; energyLevel: number | null; hrResting: number | null; sleepHours: number | null }

type GymAssignedDay = {
  id: string; dayOfWeek: number; label: string; muscleGroups: string[]; isRestDay: boolean
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

type GymVolume = { thisWeekKg: number; lastWeekKg: number; deltaPct: number | null; alert: boolean }

type Msg = { id: string; fromId: string; toId: string; content: string; readAt: string | null; createdAt: string }

type MealPlanData = { data: unknown; updatedAt: string } | null
type FoodProfileData = {
  availableFoods: string[]; availableFoodIds: string[]; restrictions: string[]
  mealsPerDay: number; weighsFood: boolean; notes: string | null
} | null
type AthleteFoodItem = {
  id: string; name: string; category: string
  kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number
  servingG: number; servingLabel?: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ['Resumen', 'Plan', 'Progreso', 'Nutrición', 'Ejercicios', 'Sesiones', 'Adherencia', 'Benchmarks', 'Mensajes']

const PHASE_KCAL_DELTA: Record<string, { label: string; delta: number; desc: string }> = {
  BASE:        { label: 'BASE',        delta: -200, desc: 'Déficit leve (−200 kcal)' },
  DESARROLLO:  { label: 'DESARROLLO',  delta:    0, desc: 'Mantenimiento' },
  ESPECIFICO:  { label: 'ESPECÍFICO',  delta: +100, desc: 'Superávit leve (+100 kcal)' },
  AFINAMIENTO: { label: 'AFINAMIENTO', delta: -100, desc: 'Reducción leve (−100 kcal)' },
}

function parseTimeToSeconds(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return Number(str)
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

  // Plan session notes
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    activePlan?.weeks.forEach((w) => {
      w.sessions.forEach((s) => { if (s.coachNote) initial[s.id] = s.coachNote })
    })
    return initial
  })
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})

  const [planViewWeekIdx, setPlanViewWeekIdx] = useState(() => getInitialWeekIdx(activePlan))

  // Plan creation
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [planGoalType, setPlanGoalType] = useState('RACE_5K')
  const [planDaysPerWeek, setPlanDaysPerWeek] = useState(4)
  const [planGenerating, setPlanGenerating] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planCreated, setPlanCreated] = useState(false)
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
    } catch { /* silently fail */ } finally { setLoadingPlans(false) }
  }

  async function handleCopyPlan() {
    if (!copySourcePlanId || !copyStartDate) return
    setPlanGenerating(true); setPlanError(null)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/plan/copy-from`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePlanId: copySourcePlanId, startDate: copyStartDate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error copiando el plan')
      setPlanCreated(true); setCreatingPlan(false)
      router.push(`/coach/athlete/${athleteId}/plan/build`)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Error desconocido')
    } finally { setPlanGenerating(false) }
  }

  async function handleCreatePlan() {
    setPlanGenerating(true); setPlanError(null)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalType: planGoalType, daysPerWeek: planDaysPerWeek, hoursPerSession: 1 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error generando el plan')
      setPlanCreated(true); setCreatingPlan(false)
      router.push(`/coach/athlete/${athleteId}/plan/build`)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Error desconocido')
    } finally { setPlanGenerating(false) }
  }

  // Activation
  const [activating, setActivating] = useState(false)
  const [activated, setActivated] = useState(initialFeatures.plan)

  async function handleActivate() {
    setActivating(true)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/config`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features: { plan: true, checkin: true, nutrition: true, progress: true, log: true, gym: true } }) })
      if (res.ok) setActivated(true)
    } finally { setActivating(false) }
  }

  // Reset password
  const [resettingPwd, setResettingPwd] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [pwdCopied, setPwdCopied] = useState(false)

  async function handleResetPassword() {
    setResettingPwd(true); setResetLink(null)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setResetLink(data.resetLink)
    } finally { setResettingPwd(false) }
  }

  async function handleCopyPassword() {
    if (!resetLink) return
    try {
      await navigator.clipboard.writeText(resetLink)
      setPwdCopied(true)
      setTimeout(() => setPwdCopied(false), 2000)
    } catch { /* no-op */ }
  }

  // Coach goal & private notes
  const [coachGoal, setCoachGoal] = useState(initialCoachGoal ?? '')
  const [privateNotes, setPrivateNotes] = useState(initialPrivateNotes ?? '')
  const [savingCoachNotes, setSavingCoachNotes] = useState(false)
  const [coachNotesSaved, setCoachNotesSaved] = useState(false)

  async function handleSaveCoachNotes() {
    setSavingCoachNotes(true); setCoachNotesSaved(false)
    try {
      await fetch(`/api/coach/athlete/${athleteId}/config`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachGoal: coachGoal.trim() || null, privateNotes: privateNotes.trim() || null }),
      })
      setCoachNotesSaved(true)
      setTimeout(() => setCoachNotesSaved(false), 2500)
    } finally { setSavingCoachNotes(false) }
  }

  // Athlete status
  const [athleteStatus, setAthleteStatus] = useState<AthleteStatus>(initialStatus)
  const [togglingStatus, setTogglingStatus] = useState(false)

  async function handleToggleStatus() {
    const next: AthleteStatus = athleteStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setTogglingStatus(true)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) setAthleteStatus(next)
    } finally { setTogglingStatus(false) }
  }

  // Benchmarks
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: benchmarkSport, metric: opt.metric, value: rawValue, unit: opt.unit, testedAt: benchmarkDate, notes: benchmarkNotes || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setBenchmarks(prev => [data.benchmark, ...prev])
        setShowBenchmarkForm(false)
        setBenchmarkValueStr(''); setBenchmarkNotes('')
      }
    } finally { setSavingBenchmark(false) }
  }

  async function handleDeleteBenchmark(benchmarkId: string) {
    const res = await fetch(`/api/coach/athlete/${athleteId}/benchmarks`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ benchmarkId }),
    })
    if (res.ok) setBenchmarks(prev => prev.filter(b => b.id !== benchmarkId))
  }

  // Nutrition
  const [editingNutrition, setEditingNutrition] = useState(false)
  const [nutritionDraft, setNutritionDraft] = useState<NutritionPlanData>(nutritionPlan)
  const [savingNutrition, setSavingNutrition] = useState(false)
  const [nutritionSaveError, setNutritionSaveError] = useState<string | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlanData>(null)
  const [foodProfile, setFoodProfile] = useState<FoodProfileData>(null)
  const [athleteFoods, setAthleteFoods] = useState<AthleteFoodItem[]>([])
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([])
  const [nutritionExtLoaded, setNutritionExtLoaded] = useState(false)
  const [adherenceData, setAdherenceData] = useState<DayAdherence[]>([])
  const [assignedTemplate, setAssignedTemplate] = useState<{
    id: string; templateId: string; assignedAt: string
    template: { id: string; name: string; goal: string | null }
  } | null>(null)
  const [templateTotals, setTemplateTotals] = useState<Record<string, { kcal: number; proteinG: number; carbsG: number; fatG: number }> | null>(null)
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [plannerKey, setPlannerKey] = useState(0)

  useEffect(() => {
    if (activeTab !== 'Nutrición' || nutritionExtLoaded) return
    Promise.all([
      fetch(`/api/coach/athlete/${athleteId}/nutrition`).then(r => r.json()),
      fetch(`/api/coach/athlete/${athleteId}/nutrition/adherence`).then(r => r.json()),
    ])
      .then(([d, adh]) => {
        setMealPlan(d.mealPlan ?? null)
        setFoodProfile(d.foodProfile ?? null)
        setAthleteFoods(d.athleteFoods ?? [])
        setFoodLogs(d.foodLogs ?? [])
        setAssignedTemplate(d.assignedTemplate ?? null)
        setTemplateTotals(d.templateTotals ?? null)
        setAdherenceData(adh.days ?? [])
        setNutritionExtLoaded(true)
      })
      .catch(() => setNutritionExtLoaded(true))
  }, [activeTab, nutritionExtLoaded, athleteId])

  async function handleApplyTemplate() {
    setApplyingTemplate(true)
    try {
      const now = new Date()
      const dow = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
      const weekStartDate = monday.toISOString().slice(0, 10)
      const res = await fetch(`/api/coach/athlete/${athleteId}/nutrition/apply-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate }),
      })
      if (res.ok) {
        const data = await res.json()
        setPlannerKey(k => k + 1)
        alert(`Template aplicado: ${data.created} items creados para la semana.`)
      } else {
        const err = await res.json().catch(() => null)
        alert(err?.error ?? 'Error al aplicar template')
      }
    } finally { setApplyingTemplate(false) }
  }

  // Session editor
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [sessionDraft, setSessionDraft] = useState<{ durationMin: number; type: string; zoneTarget: string; detailText: string; structure: string }>({
    durationMin: 60, type: '', zoneTarget: '', detailText: '', structure: ''
  })
  const [savingSession, setSavingSession] = useState(false)

  async function handleSaveSession(sessionId: string) {
    setSavingSession(true)
    try {
      await fetch(`/api/coach/sessions/${sessionId}/edit`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionDraft),
      })
      setEditingSession(null)
      router.refresh()
    } finally { setSavingSession(false) }
  }

  // Gym — exercise logs
  const [gymLogs, setGymLogs] = useState<GymExerciseLog[]>([])
  const [gymLoading, setGymLoading] = useState(false)
  const [gymLoaded, setGymLoaded] = useState(false)

  // Gym — assigned routine
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
      .then((data) => { setGymLogs(Array.isArray(data) ? data : []); setGymLoaded(true) })
      .catch(() => setGymLogs([]))
      .finally(() => setGymLoading(false))
  }, [activeTab, gymLoaded, athleteId])

  // Running / activity logs
  const [runningLogs, setRunningLogs] = useState<RunningLog[]>([])
  const [runningLogsLoading, setRunningLogsLoading] = useState(false)
  const [runningLogsLoaded, setRunningLogsLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Sesiones' || runningLogsLoaded) return
    setRunningLogsLoading(true)
    fetch(`/api/coach/athlete/${athleteId}/running-logs`)
      .then(r => r.json())
      .then(data => { setRunningLogs(Array.isArray(data) ? data : []); setRunningLogsLoaded(true) })
      .catch(() => setRunningLogsLoaded(true))
      .finally(() => setRunningLogsLoading(false))
  }, [activeTab, runningLogsLoaded, athleteId])

  // PRs
  const [gymPRs, setGymPRs] = useState<GymPR[]>([])
  const [gymPRsLoading, setGymPRsLoading] = useState(false)
  const [gymPRsLoaded, setGymPRsLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Sesiones' || gymPRsLoaded) return
    setGymPRsLoading(true)
    fetch(`/api/coach/gym/athlete/${athleteId}/prs`)
      .then(r => r.json())
      .then(data => { setGymPRs(data.prs ?? []); setGymPRsLoaded(true) })
      .catch(() => setGymPRsLoaded(true))
      .finally(() => setGymPRsLoading(false))
  }, [activeTab, gymPRsLoaded, athleteId])

  // Daily logs
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([])
  const [dailyLogsLoaded, setDailyLogsLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Resumen' || dailyLogsLoaded) return
    fetch(`/api/coach/athlete/${athleteId}/dailylogs`)
      .then(r => r.json())
      .then((data: { logs?: DailyLogEntry[] }) => { setDailyLogs(data.logs ?? []); setDailyLogsLoaded(true) })
      .catch(() => setDailyLogsLoaded(true))
  }, [activeTab, dailyLogsLoaded, athleteId])

  // Adherencia gym
  const [gymAdherence, setGymAdherence] = useState<AdherenceWeek[]>([])
  const [gymAdherenceLoading, setGymAdherenceLoading] = useState(false)
  const [gymAdherenceLoaded, setGymAdherenceLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Adherencia' || gymAdherenceLoaded) return
    setGymAdherenceLoading(true)
    fetch(`/api/coach/gym/athlete/${athleteId}/adherence`)
      .then(r => r.json())
      .then(data => { setGymAdherence(data.weeks ?? []); setGymAdherenceLoaded(true) })
      .catch(() => setGymAdherenceLoaded(true))
      .finally(() => setGymAdherenceLoading(false))
  }, [activeTab, gymAdherenceLoaded, athleteId])

  // Running adherence (plan de entrenamiento)
  const [runningAdherence, setRunningAdherence] = useState<AdherenceWeek[]>([])
  const [runningAdherenceLoading, setRunningAdherenceLoading] = useState(false)
  const [runningAdherenceLoaded, setRunningAdherenceLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Adherencia' || runningAdherenceLoaded) return
    setRunningAdherenceLoading(true)
    fetch(`/api/coach/athlete/${athleteId}/running-adherence`)
      .then(r => r.json())
      .then(data => { setRunningAdherence(data.weeks ?? []); setRunningAdherenceLoaded(true) })
      .catch(() => setRunningAdherenceLoaded(true))
      .finally(() => setRunningAdherenceLoading(false))
  }, [activeTab, runningAdherenceLoaded, athleteId])

  // Volumen semanal
  const [gymVolume, setGymVolume] = useState<GymVolume | null>(null)
  const [gymVolumeLoaded, setGymVolumeLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'Adherencia' || gymVolumeLoaded) return
    fetch(`/api/coach/gym/athlete/${athleteId}/volume`)
      .then(r => r.json())
      .then(data => { setGymVolume(data); setGymVolumeLoaded(true) })
      .catch(() => setGymVolumeLoaded(true))
  }, [activeTab, gymVolumeLoaded, athleteId])

  // Mensajes
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
    fetch('/api/messages/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromId: athleteId }) })
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [activeTab, athleteId])

  async function handleSendMessage() {
    if (!msgInput.trim() || msgSending) return
    setMsgSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toId: athleteId, content: msgInput.trim() }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMsgs(prev => [...prev, message])
        setMsgInput('')
      }
    } finally { setMsgSending(false) }
  }

  function handleNoteChange(sessionId: string, value: string) {
    setNotes((prev) => ({ ...prev, [sessionId]: value }))
    setSavedNotes((prev) => ({ ...prev, [sessionId]: false }))
  }

  async function handleSaveNote(sessionId: string) {
    setSavingNotes((prev) => ({ ...prev, [sessionId]: true }))
    try {
      await fetch(`/api/coach/sessions/${sessionId}/note`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes[sessionId] ?? '' }),
      })
      setSavedNotes((prev) => ({ ...prev, [sessionId]: true }))
    } finally { setSavingNotes((prev) => ({ ...prev, [sessionId]: false })) }
  }

  async function handleSaveNutrition() {
    if (!nutritionDraft) return
    setSavingNutrition(true); setNutritionSaveError(null)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/nutrition`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nutritionDraft),
      })
      if (res.ok) {
        setEditingNutrition(false)
      } else {
        setNutritionSaveError('Error al guardar. Inténtalo de nuevo.')
      }
    } catch {
      setNutritionSaveError('Error de conexión.')
    } finally { setSavingNutrition(false) }
  }

  // ── Computed values ───────────────────────────────────────────────────────────

  const hrMaxValue = healthProfile?.hrMax ?? (healthProfile?.age ? 220 - healthProfile.age : 185)
  const zones = [
    { label: 'Z1 — Recuperación', min: Math.round(hrMaxValue * 0.5), max: Math.round(hrMaxValue * 0.6) },
    { label: 'Z2 — Base aeróbica', min: Math.round(hrMaxValue * 0.6), max: Math.round(hrMaxValue * 0.7) },
    { label: 'Z3 — Tempo', min: Math.round(hrMaxValue * 0.7), max: Math.round(hrMaxValue * 0.8) },
    { label: 'Z4 — Umbral', min: Math.round(hrMaxValue * 0.8), max: Math.round(hrMaxValue * 0.9) },
    { label: 'Z5 — VO2max', min: Math.round(hrMaxValue * 0.9), max: hrMaxValue },
  ]

  const latestCheckIn = recentCheckIns[0] ?? null
  const checkInsSorted = [...recentCheckIns].sort((a, b) => a.weekNumber - b.weekNumber)
  const weights = checkInsSorted.map((c) => c.weightKg).filter((w): w is number => w !== null)
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0

  const lastCheckInDaysAgo = latestCheckIn
    ? Math.floor((Date.now() - new Date(latestCheckIn.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const alerts: string[] = []
  if (recentCheckIns.length === 0) alerts.push('Sin check-ins registrados aún')
  if (lastCheckInDaysAgo !== null && lastCheckInDaysAgo >= 7) alerts.push(`Check-in pendiente hace ${lastCheckInDaysAgo} días`)
  if (latestCheckIn?.painFlag) alerts.push('Reporte de dolor en el último check-in')
  if (latestCheckIn?.hrResting !== null && latestCheckIn?.hrResting !== undefined &&
      healthProfile?.hrResting !== null && healthProfile?.hrResting !== undefined &&
      latestCheckIn.hrResting > healthProfile.hrResting + 10) {
    alerts.push('FC reposo elevada respecto al valor basal')
  }

  const displayName = athlete.name ?? athlete.email
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4 lg:p-6 max-w-4xl mx-auto">
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

      {activeTab === 'Resumen' && (
        <ResumenTab
          athleteId={athleteId}
          athlete={athlete}
          healthProfile={healthProfile}
          activePlan={activePlan}
          initialFeatures={initialFeatures}
          activated={activated}
          activating={activating}
          handleActivate={handleActivate}
          resettingPwd={resettingPwd}
          resetLink={resetLink}
          pwdCopied={pwdCopied}
          handleResetPassword={handleResetPassword}
          handleCopyPassword={handleCopyPassword}
          coachGoal={coachGoal}
          setCoachGoal={setCoachGoal}
          privateNotes={privateNotes}
          setPrivateNotes={setPrivateNotes}
          savingCoachNotes={savingCoachNotes}
          coachNotesSaved={coachNotesSaved}
          handleSaveCoachNotes={handleSaveCoachNotes}
          zones={zones}
          latestCheckIn={latestCheckIn}
          checkInsSorted={checkInsSorted}
          lastCheckInDaysAgo={lastCheckInDaysAgo}
          alerts={alerts}
          dailyLogs={dailyLogs}
        />
      )}

      {activeTab === 'Plan' && (
        <PlanTab
          athleteId={athleteId}
          activePlan={activePlan}
          healthProfile={healthProfile}
          creatingPlan={creatingPlan}
          setCreatingPlan={setCreatingPlan}
          planGoalType={planGoalType}
          setPlanGoalType={setPlanGoalType}
          planDaysPerWeek={planDaysPerWeek}
          setPlanDaysPerWeek={setPlanDaysPerWeek}
          planGenerating={planGenerating}
          planError={planError}
          planMode={planMode}
          setPlanMode={setPlanMode}
          copySourcePlanId={copySourcePlanId}
          setCopySourcePlanId={setCopySourcePlanId}
          copyStartDate={copyStartDate}
          setCopyStartDate={setCopyStartDate}
          availablePlans={availablePlans}
          loadingPlans={loadingPlans}
          loadAvailablePlans={loadAvailablePlans}
          handleCopyPlan={handleCopyPlan}
          handleCreatePlan={handleCreatePlan}
          planViewWeekIdx={planViewWeekIdx}
          setPlanViewWeekIdx={setPlanViewWeekIdx}
          notes={notes}
          savedNotes={savedNotes}
          savingNotes={savingNotes}
          editingSession={editingSession}
          setEditingSession={setEditingSession}
          sessionDraft={sessionDraft}
          setSessionDraft={setSessionDraft}
          savingSession={savingSession}
          handleNoteChange={handleNoteChange}
          handleSaveNote={handleSaveNote}
          handleSaveSession={handleSaveSession}
        />
      )}

      {activeTab === 'Progreso' && (
        <ProgresoTab
          checkInsSorted={checkInsSorted}
          weights={weights}
          maxWeight={maxWeight}
          minWeight={minWeight}
        />
      )}

      {activeTab === 'Nutrición' && (
        <NutricionTab
          athleteId={athleteId}
          nutritionPlan={nutritionPlan}
          activePlan={activePlan}
          healthProfile={healthProfile}
          editingNutrition={editingNutrition}
          setEditingNutrition={setEditingNutrition}
          nutritionDraft={nutritionDraft}
          setNutritionDraft={setNutritionDraft as (fn: (prev: NutritionPlanData) => NutritionPlanData) => void}
          savingNutrition={savingNutrition}
          nutritionSaveError={nutritionSaveError}
          foodProfile={foodProfile}
          foodLogs={foodLogs}
          nutritionExtLoaded={nutritionExtLoaded}
          adherenceData={adherenceData}
          selfReportedAdherencePct={latestCheckIn?.dietAdherencePct ?? null}
          assignedTemplate={assignedTemplate}
          templateTotals={templateTotals}
          applyingTemplate={applyingTemplate}
          handleApplyTemplate={handleApplyTemplate}
          plannerKey={plannerKey}
          setPlannerKey={setPlannerKey as (fn: (k: number) => number) => void}
          handleSaveNutrition={handleSaveNutrition}
          applyPhaseTargets={applyPhaseTargets}
          currentPhase={currentPhase}
        />
      )}

      {activeTab === 'Sesiones' && (
        <SesionesTab
          gymLoading={gymLoading}
          gymLoaded={gymLoaded}
          gymLogs={gymLogs}
          gymPRsLoading={gymPRsLoading}
          gymPRsLoaded={gymPRsLoaded}
          gymPRs={gymPRs}
          runningLogs={runningLogs}
          runningLogsLoading={runningLogsLoading}
          runningLogsLoaded={runningLogsLoaded}
        />
      )}

      {activeTab === 'Adherencia' && (
        <AdherenciaTab
          gymVolume={gymVolume}
          gymAdherenceLoading={gymAdherenceLoading}
          gymAdherenceLoaded={gymAdherenceLoaded}
          gymAdherence={gymAdherence}
          runningAdherence={runningAdherence}
          runningAdherenceLoading={runningAdherenceLoading}
          runningAdherenceLoaded={runningAdherenceLoaded}
        />
      )}

      {activeTab === 'Benchmarks' && (
        <BenchmarksTab
          benchmarks={benchmarks}
          benchmarksLoading={benchmarksLoading}
          showBenchmarkForm={showBenchmarkForm}
          setShowBenchmarkForm={setShowBenchmarkForm}
          benchmarkSport={benchmarkSport}
          setBenchmarkSport={setBenchmarkSport}
          benchmarkMetric={benchmarkMetric}
          setBenchmarkMetric={setBenchmarkMetric}
          benchmarkValueStr={benchmarkValueStr}
          setBenchmarkValueStr={setBenchmarkValueStr}
          benchmarkDate={benchmarkDate}
          setBenchmarkDate={setBenchmarkDate}
          benchmarkNotes={benchmarkNotes}
          setBenchmarkNotes={setBenchmarkNotes}
          savingBenchmark={savingBenchmark}
          handleAddBenchmark={handleAddBenchmark}
          handleDeleteBenchmark={handleDeleteBenchmark}
          formatBenchmarkValue={formatBenchmarkValue}
        />
      )}

      {activeTab === 'Ejercicios' && (
        <EjerciciosTab
          gymAssignedLoading={gymAssignedLoading}
          gymAssigned={gymAssigned}
        />
      )}

      {activeTab === 'Mensajes' && (
        <MensajesTab
          athleteId={athleteId}
          msgs={msgs}
          msgsLoaded={msgsLoaded}
          msgInput={msgInput}
          setMsgInput={setMsgInput}
          msgSending={msgSending}
          handleSendMessage={handleSendMessage}
        />
      )}
    </div>
  )
}
