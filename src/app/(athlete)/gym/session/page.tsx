'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Timer,
  Loader2,
  X,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type ExerciseData = {
  id: string
  name: string
  muscleGroups: string[]
  equipment: string
  category: string
  description: string | null
  tips: string | null
}

type WorkoutExercise = {
  id: string
  order: number
  sets: number
  repsScheme: string
  restSeconds: number | null
  notes: string | null
  setType: string
  supersetWith: string | null
  exercise: ExerciseData
}

type PreviousLog = {
  workoutExerciseId: string
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
}

type SessionData = {
  assignedWorkoutId: string
  templateName: string
  dayOfWeek: number
  isRestDay: boolean
  workoutDay: {
    id: string
    label: string
    muscleGroups: string[]
    warmupNotes: string | null
    cardioNotes: string | null
  } | null
  exercises: WorkoutExercise[]
  previousLogs: PreviousLog[]
}

type SetState = {
  weightKg: string
  repsCompleted: string
  completed: boolean
}

// exerciseId -> setIndex (0-based) -> SetState
type SetsMap = Record<string, SetState[]>

// ─── Rest Timer ──────────────────────────────────────────────────────────────

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) {
      onDone()
      return
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onDone])

  const pct = ((seconds - remaining) / seconds) * 100

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-3">
      <Timer size={18} className="text-blue-500 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-blue-700">Descanso</span>
          <span className="text-sm font-bold text-blue-700">{remaining}s</span>
        </div>
        <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button
        onClick={onDone}
        className="text-blue-400 hover:text-blue-600 transition-colors"
        aria-label="Saltar descanso"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Complete Modal ───────────────────────────────────────────────────────────

function CompleteModal({
  onSubmit,
  onClose,
  loading,
}: {
  onSubmit: (rpe: number, durationMin: number, notes: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [rpe, setRpe] = useState(7)
  const [durationMin, setDurationMin] = useState(60)
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold text-[#1e3a5f]">Finalizar sesión</h2>
          <p className="text-sm text-gray-500 mt-0.5">¿Cómo fue tu sesión de hoy?</p>
        </div>

        <div className="px-6 space-y-5 pb-6">
          {/* RPE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Esfuerzo percibido (RPE)</label>
              <span className="text-lg font-bold text-[#f97316]">{rpe}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="w-full accent-[#f97316]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Muy fácil</span>
              <span>Máximo esfuerzo</span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Duración (minutos)</label>
            <input
              type="number"
              min={1}
              max={300}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 focus:border-[#f97316]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="¿Alguna observación sobre la sesión?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 focus:border-[#f97316]"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 font-medium text-sm py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit(rpe, durationMin, notes)}
            disabled={loading}
            className="flex-1 bg-[#f97316] hover:bg-orange-600 text-white font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Guardar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GymSessionPage() {
  const router = useRouter()
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // sets state: workoutExercise.id -> array of SetState
  const [setsMap, setSetsMap] = useState<SetsMap>({})

  // which exercises are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // rest timer state: workoutExerciseId that just completed a set
  const [activeTimer, setActiveTimer] = useState<{ weId: string; seconds: number } | null>(null)

  // modal
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch session data on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/gym/session/today')
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Error cargando la sesión')
          return
        }
        const data: SessionData = await res.json()
        setSessionData(data)

        // Initialize setsMap
        const initial: SetsMap = {}
        for (const we of data.exercises) {
          initial[we.id] = Array.from({ length: we.sets }, (_, idx) => {
            const prev = data.previousLogs.find(
              (l) => l.workoutExerciseId === we.id && l.setNumber === idx + 1
            )
            return {
              weightKg: '',
              repsCompleted: '',
              completed: false,
              _prevWeight: prev?.weightKg ?? null,
              _prevReps: prev?.repsCompleted ?? null,
            } as SetState & { _prevWeight: number | null; _prevReps: number | null }
          })
        }
        setSetsMap(initial)

        // Expand first exercise by default
        if (data.exercises.length > 0) {
          setExpanded(new Set([data.exercises[0].id]))
        }
      } catch {
        setError('No se pudo cargar la sesión')
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [])

  const prevLogsMap = useRef<Record<string, Record<number, PreviousLog>>>({})
  useEffect(() => {
    if (!sessionData) return
    const map: Record<string, Record<number, PreviousLog>> = {}
    for (const log of sessionData.previousLogs) {
      if (!map[log.workoutExerciseId]) map[log.workoutExerciseId] = {}
      map[log.workoutExerciseId][log.setNumber] = log
    }
    prevLogsMap.current = map
  }, [sessionData])

  const toggleExpanded = useCallback((weId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(weId)) next.delete(weId)
      else next.add(weId)
      return next
    })
  }, [])

  const updateSet = useCallback((weId: string, setIdx: number, field: 'weightKg' | 'repsCompleted', value: string) => {
    setSetsMap((prev) => {
      const copy = { ...prev }
      copy[weId] = copy[weId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
      return copy
    })
  }, [])

  const toggleSetDone = useCallback((weId: string, setIdx: number, restSeconds: number | null) => {
    setSetsMap((prev) => {
      const copy = { ...prev }
      const wasCompleted = copy[weId][setIdx].completed
      copy[weId] = copy[weId].map((s, i) => i === setIdx ? { ...s, completed: !wasCompleted } : s)
      if (!wasCompleted && restSeconds && restSeconds > 0) {
        setActiveTimer({ weId, seconds: restSeconds })
      }
      return copy
    })
  }, [])

  // Calculate progress
  const { completedSets, totalSets } = (() => {
    let done = 0
    let total = 0
    for (const sets of Object.values(setsMap)) {
      total += sets.length
      done += sets.filter((s) => s.completed).length
    }
    return { completedSets: done, totalSets: total }
  })()

  // Can finish if at least one set logged per exercise (or no exercises)
  const canFinish = sessionData?.exercises.length === 0
    || sessionData?.exercises.every((we) => setsMap[we.id]?.some((s) => s.completed)) === true

  const handleComplete = useCallback(async (rpe: number, durationMin: number, notes: string) => {
    if (!sessionData) return
    setSubmitting(true)

    const sets: {
      workoutExerciseId: string
      setNumber: number
      weightKg: number | null
      repsCompleted: number | null
      completed: boolean
    }[] = []

    for (const we of sessionData.exercises) {
      const weSets = setsMap[we.id] ?? []
      weSets.forEach((s, idx) => {
        sets.push({
          workoutExerciseId: we.id,
          setNumber: idx + 1,
          weightKg: s.weightKg !== '' ? parseFloat(s.weightKg) : null,
          repsCompleted: s.repsCompleted !== '' ? parseInt(s.repsCompleted) : null,
          completed: s.completed,
        })
      })
    }

    try {
      const res = await fetch('/api/gym/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedWorkoutId: sessionData.assignedWorkoutId,
          dayOfWeek: sessionData.dayOfWeek,
          rpe,
          durationMin,
          notes,
          sets,
        }),
      })

      if (!res.ok) throw new Error('Error guardando sesión')

      router.push('/gym?completed=1')
    } catch {
      setSubmitting(false)
      alert('Error al guardar la sesión. Intenta de nuevo.')
    }
  }, [sessionData, setsMap, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto">
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-gray-600 hover:text-[#f97316] transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  if (!sessionData || sessionData.isRestDay) {
    return (
      <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="font-semibold text-gray-700 text-lg">Día de descanso</p>
          <p className="text-sm text-gray-500 mt-1">Disfruta tu recuperación</p>
          <button
            onClick={() => router.push('/gym')}
            className="mt-5 text-sm font-medium text-[#1e3a5f] hover:text-[#f97316] transition-colors"
          >
            ← Volver al gym
          </button>
        </div>
      </div>
    )
  }

  const { workoutDay, exercises } = sessionData

  return (
    <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto pb-32 md:pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            onClick={() => router.push('/gym')}
            className="text-sm text-gray-500 hover:text-[#f97316] transition-colors mb-2 block"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold text-[#1e3a5f] leading-tight">
            {workoutDay?.label ?? 'Sesión de hoy'}
          </h1>
          {workoutDay?.muscleGroups && workoutDay.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {workoutDay.muscleGroups.map((mg) => (
                <span key={mg} className="text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full">
                  {mg}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-[#1e3a5f]">{completedSets}</p>
          <p className="text-xs text-gray-500">de {totalSets} series</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progreso</span>
          <span className="text-xs text-gray-500">{totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Warmup notes */}
      {workoutDay?.warmupNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Calentamiento: </span>{workoutDay.warmupNotes}
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        {exercises.map((we, exIdx) => {
          const sets = setsMap[we.id] ?? []
          const isExpanded = expanded.has(we.id)
          const completedCount = sets.filter((s) => s.completed).length
          const allDone = completedCount === sets.length && sets.length > 0
          const showTimer = activeTimer?.weId === we.id

          return (
            <div
              key={we.id}
              className={`bg-white border rounded-xl overflow-hidden transition-colors ${
                allDone ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              {/* Exercise header */}
              <button
                onClick={() => toggleExpanded(we.id)}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                  allDone ? 'bg-green-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  allDone ? 'bg-green-500 text-white' : 'bg-[#1e3a5f] text-white'
                }`}>
                  {allDone ? '✓' : exIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${allDone ? 'text-green-700' : 'text-gray-900'}`}>
                    {we.exercise.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">{we.sets} series · {we.repsScheme} reps</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                      {we.exercise.equipment}
                    </span>
                    {we.setType !== 'NORMAL' && (
                      <span className="text-xs bg-[#f97316]/10 text-[#f97316] px-1.5 py-0.5 rounded font-semibold">
                        {we.setType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{completedCount}/{sets.length}</span>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  {/* Description/tips */}
                  {(we.exercise.description || we.exercise.tips) && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 space-y-1">
                      {we.exercise.description && <p>{we.exercise.description}</p>}
                      {we.exercise.tips && <p className="text-[#1e3a5f] font-medium">💡 {we.exercise.tips}</p>}
                    </div>
                  )}

                  {/* Reps scheme guide */}
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Objetivo: </span>{we.repsScheme} reps
                    {we.restSeconds ? <span className="ml-2">· Descanso: {we.restSeconds}s</span> : null}
                  </p>
                  {we.notes && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{we.notes}</p>
                  )}

                  {/* Sets */}
                  <div className="space-y-2">
                    {sets.map((s, setIdx) => {
                      const prevLog = prevLogsMap.current[we.id]?.[setIdx + 1]
                      const extSet = s as SetState & { _prevWeight?: number | null; _prevReps?: number | null }

                      return (
                        <div
                          key={setIdx}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all ${
                            s.completed
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          {/* Set badge */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            s.completed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {setIdx + 1}
                          </div>

                          {/* Inputs */}
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1">
                              {(prevLog?.weightKg != null || extSet._prevWeight != null) && (
                                <p className="text-[10px] text-gray-400 mb-0.5">
                                  Última: {prevLog?.weightKg ?? extSet._prevWeight} kg
                                </p>
                              )}
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={0.5}
                                placeholder="kg"
                                value={s.weightKg}
                                onChange={(e) => updateSet(we.id, setIdx, 'weightKg', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 focus:border-[#f97316] min-w-0"
                              />
                            </div>
                            <span className="text-gray-400 text-sm">×</span>
                            <div className="flex-1">
                              {(prevLog?.repsCompleted != null || extSet._prevReps != null) && (
                                <p className="text-[10px] text-gray-400 mb-0.5">
                                  Última: {prevLog?.repsCompleted ?? extSet._prevReps} reps
                                </p>
                              )}
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                placeholder="reps"
                                value={s.repsCompleted}
                                onChange={(e) => updateSet(we.id, setIdx, 'repsCompleted', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 focus:border-[#f97316] min-w-0"
                              />
                            </div>
                          </div>

                          {/* Done button */}
                          <button
                            onClick={() => toggleSetDone(we.id, setIdx, we.restSeconds)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                              s.completed
                                ? 'bg-green-500 text-white scale-110'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            aria-label={s.completed ? 'Desmarcar serie' : 'Marcar serie completa'}
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Rest timer */}
                  {showTimer && (
                    <RestTimer
                      seconds={activeTimer!.seconds}
                      onDone={() => setActiveTimer(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Cardio notes */}
      {workoutDay?.cardioNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <span className="font-semibold">Cardio: </span>{workoutDay.cardioNotes}
        </div>
      )}

      {/* Finish button */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:relative p-4 md:p-0 bg-white md:bg-transparent border-t border-gray-200 md:border-0 md:pt-2">
        <button
          onClick={() => setShowModal(true)}
          disabled={!canFinish}
          className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
            canFinish
              ? 'bg-[#f97316] hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canFinish ? '🏁 Finalizar sesión' : `Completa al menos 1 serie por ejercicio (${completedSets}/${totalSets})`}
        </button>
      </div>

      {/* Complete modal */}
      {showModal && (
        <CompleteModal
          onSubmit={handleComplete}
          onClose={() => setShowModal(false)}
          loading={submitting}
        />
      )}
    </div>
  )
}
