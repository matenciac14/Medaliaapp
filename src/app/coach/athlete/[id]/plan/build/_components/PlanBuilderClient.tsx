'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { getInitialWeekIdx } from '@/lib/core/week-number'

// ── Types ────────────────────────────────────────────────────────────────────

type GymExercisePreview = { name: string; sets: number; repsScheme: string }

type GymTemplateDay = {
  id: string
  label: string
  muscleGroups: string[]
  exercises: GymExercisePreview[]
}

type GymTemplate = {
  id: string
  name: string
  days: GymTemplateDay[]
}

type BuilderSession = {
  id: string
  dayOfWeek: number
  type: string
  durationMin: number
  zoneTarget: string | null
  detailText: string | null
  sportLabel: string | null
  workoutDayId: string | null
  workoutDay: { id: string; label: string; exercises: GymExercisePreview[] } | null
}

type BuilderWeek = {
  id: string
  weekNumber: number
  phase: string
  focusDescription: string | null
  isRecoveryWeek: boolean
  volumeKm: number | null
  startDate: string
  endDate: string
  sessions: BuilderSession[]
}

type BuilderPlan = {
  id: string
  name: string
  totalWeeks: number
  startDate: string
  weeks: BuilderWeek[]
}

type ModalState = {
  weekId: string
  dayOfWeek: number
  session?: BuilderSession
  preselectedType?: string
}

type WeekEditState = {
  weekId: string
  phase: string
  focusDescription: string
  isRecoveryWeek: boolean
  volumeKm: number | null
}

type Props = {
  athleteId: string
  athleteName: string
  initialPlan: BuilderPlan | null
  gymTemplates: GymTemplate[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const SESSION_TYPES = [
  { type: 'RODAJE_Z2',    label: 'Rodaje Z2',    color: '#16a34a' },
  { type: 'FARTLEK',      label: 'Fartlek',      color: '#f97316' },
  { type: 'TEMPO',        label: 'Tempo',        color: '#dc2626' },
  { type: 'TIRADA_LARGA', label: 'Tirada larga', color: '#3b82f6' },
  { type: 'INTERVALOS',   label: 'Intervalos',   color: '#ef4444' },
  { type: 'FUERZA',       label: 'Fuerza',       color: '#7c3aed' },
  { type: 'CICLA',        label: 'Ciclismo',     color: '#d97706' },
  { type: 'NATACION',     label: 'Natación',     color: '#0891b2' },
  { type: 'TEST',         label: 'Test',         color: '#6366f1' },
  { type: 'DESCANSO',     label: 'Descanso',     color: '#9ca3af' },
]

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function getSessionConfig(type: string) {
  return SESSION_TYPES.find((s) => s.type === type) ?? { type, label: type, color: '#9ca3af' }
}

function dayDate(weekStartDate: string, dayOfWeek: number): Date {
  const d = new Date(weekStartDate)
  d.setDate(d.getDate() + dayOfWeek)
  return d
}

function formatWeekRange(startDate: string, endDate: string): string {
  const s = new Date(startDate)
  const e = new Date(endDate)
  return `${s.getDate()} al ${e.getDate()} ${MONTHS[e.getMonth()]}`
}

// ── Main component ───────────────────────────────────────────────────────────

const PHASES = ['BASE', 'DESARROLLO', 'ESPECÍFICO', 'AFINAMIENTO', 'COMPETICIÓN', 'RECUPERACIÓN']

const PHASE_COLORS: Record<string, string> = {
  BASE: '#1e3a5f', DESARROLLO: '#f97316', 'ESPECÍFICO': '#dc2626',
  AFINAMIENTO: '#7c3aed', 'COMPETICIÓN': '#0891b2', 'RECUPERACIÓN': '#16a34a',
}

export default function PlanBuilderClient({ athleteId, athleteName, initialPlan, gymTemplates }: Props) {
  const [plan, setPlan] = useState<BuilderPlan | null>(initialPlan)

  // ── Estado para crear plan desde cero ──────────────────────────────────────
  const [creating, setCreating]           = useState(false)
  const [newName, setNewName]             = useState(`Plan ${athleteName.split(' ')[0]}`)
  const [newWeeks, setNewWeeks]           = useState(12)
  const [newStart, setNewStart]           = useState(() => new Date().toISOString().split('T')[0])
  const [createError, setCreateError]     = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  async function handleCreateCustomPlan() {
    setCreateError(null)
    setCreateLoading(true)
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/plan/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, totalWeeks: newWeeks, startDate: newStart }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el plan')
      setPlan(data.plan)
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }
  const [weekIdx, setWeekIdx] = useState(() => getInitialWeekIdx(initialPlan))
  const [modal, setModal] = useState<ModalState | null>(null)
  const [weekEdit, setWeekEdit] = useState<WeekEditState | null>(null)
  const [saving, setSaving] = useState(false)

  const week = plan?.weeks[weekIdx] ?? null

  function openAddModal(weekId: string, dayOfWeek: number, preselectedType?: string) {
    setModal({ weekId, dayOfWeek, preselectedType })
  }

  function openEditModal(session: BuilderSession, weekId: string) {
    setModal({ weekId, dayOfWeek: session.dayOfWeek, session })
  }

  async function handleSaveSession(data: {
    type: string
    durationMin: number
    zoneTarget: string
    detailText: string
    sportLabel: string
    workoutDayId: string | null
  }) {
    if (!modal || !plan) return
    setSaving(true)
    // Resolve workoutDay preview for optimistic update
    const allDays = gymTemplates.flatMap(t => t.days)
    const resolvedDay = data.workoutDayId ? (allDays.find(d => d.id === data.workoutDayId) ?? null) : null
    try {
      if (modal.session) {
        const res = await fetch(`/api/coach/sessions/${modal.session.id}/edit`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Error actualizando sesión')
        const { session: updated } = await res.json()
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                weeks: prev.weeks.map((w) => ({
                  ...w,
                  sessions: w.sessions.map((s) =>
                    s.id === modal.session!.id
                      ? { ...s, ...updated, workoutDayId: data.workoutDayId, workoutDay: resolvedDay ? { id: resolvedDay.id, label: resolvedDay.label, exercises: resolvedDay.exercises } : null }
                      : s
                  ),
                })),
              }
            : prev
        )
      } else {
        const res = await fetch(`/api/coach/plan/${plan.id}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekId: modal.weekId, dayOfWeek: modal.dayOfWeek, ...data }),
        })
        if (!res.ok) throw new Error('Error creando sesión')
        const { session: created } = await res.json()
        const createdWithGym = {
          ...created,
          workoutDayId: data.workoutDayId,
          workoutDay: resolvedDay ? { id: resolvedDay.id, label: resolvedDay.label, exercises: resolvedDay.exercises } : null,
        }
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                weeks: prev.weeks.map((w) =>
                  w.id === modal.weekId
                    ? {
                        ...w,
                        sessions: [...w.sessions, createdWithGym].sort(
                          (a, b) => a.dayOfWeek - b.dayOfWeek
                        ),
                      }
                    : w
                ),
              }
            : prev
        )
      }
      setModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!plan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/sessions/${sessionId}/edit`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error eliminando sesión')
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              weeks: prev.weeks.map((w) => ({
                ...w,
                sessions: w.sessions.filter((s) => s.id !== sessionId),
              })),
            }
          : prev
      )
      setModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyPrevWeek() {
    if (!plan || !week || weekIdx === 0) return
    if (!confirm(`¿Copiar todas las sesiones de Semana ${week.weekNumber - 1} a Semana ${week.weekNumber}? Esto reemplazará las sesiones actuales.`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/plan/${plan.id}/week/${week.id}/copy-prev`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error copiando semana')
      }
      const { sessions } = await res.json()
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              weeks: prev.weeks.map((w) =>
                w.id === week.id ? { ...w, sessions } : w
              ),
            }
          : prev
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveWeekMeta(data: { phase: string; focusDescription: string; isRecoveryWeek: boolean; volumeKm: number | null }) {
    if (!plan || !weekEdit) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/plan/${plan.id}/week/${weekEdit.weekId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error actualizando semana')
      const { week: updated } = await res.json()
      setPlan((prev) =>
        prev
          ? { ...prev, weeks: prev.weeks.map((w) => w.id === weekEdit.weekId ? { ...w, ...updated } : w) }
          : prev
      )
      setWeekEdit(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  // ── No plan — formulario de creación desde cero ──────────────────────────

  if (!plan) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
        <BuilderHeader athleteId={athleteId} athleteName={athleteName} />
        <div className="flex-1 flex items-center justify-center p-6">
          {!creating ? (
            <div className="text-center">
              <p className="text-5xl mb-4">📋</p>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin plan activo</h2>
              <p className="text-gray-400 text-sm mb-6">Crea un plan en blanco y rellénalo sesión a sesión</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#1e3a5f' }}
                >
                  + Crear plan en blanco
                </button>
                <Link
                  href={`/coach/athlete/${athleteId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  ← Ir al panel del atleta
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Nuevo plan de entrenamiento</h2>
                <p className="text-sm text-gray-400 mt-1">Se crearán las semanas vacías. Agrega las sesiones desde el builder.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del plan</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej. Plan Running Temporada 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                <select
                  value={newWeeks}
                  onChange={(e) => setNewWeeks(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                >
                  {[4, 6, 8, 10, 12, 16, 18, 20, 24].map((w) => (
                    <option key={w} value={w}>{w} semanas</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                <input
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>

              {createError && (
                <p className="text-sm text-red-500">{createError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setCreating(false); setCreateError(null) }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCustomPlan}
                  disabled={createLoading || !newName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#1e3a5f' }}
                >
                  {createLoading ? 'Creando...' : 'Crear plan →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Builder ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">
      <BuilderHeader athleteId={athleteId} athleteName={athleteName} planName={plan.name} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-56 border-r border-gray-200 bg-white overflow-y-auto p-4 shrink-0 hidden lg:block">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Tipos de sesión
          </p>
          <div className="space-y-0.5">
            {SESSION_TYPES.map((st) => (
              <button
                key={st.type}
                onClick={() => week && openAddModal(week.id, 0, st.type)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.color }}
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900">{st.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Week grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Week nav */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
              disabled={weekIdx === 0}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} /> Sem anterior
            </button>
            <div className="flex-1 text-center">
              <span className="font-semibold text-gray-900">Semana {week!.weekNumber}</span>
              <span className="text-gray-400 text-sm ml-2">
                — {formatWeekRange(week!.startDate, week!.endDate)}
              </span>
              {week!.isRecoveryWeek && (
                <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Recuperación
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {weekIdx > 0 && (
                <button
                  onClick={handleCopyPrevWeek}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1e3a5f] border border-gray-200 hover:border-[#1e3a5f]/30 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40"
                  title="Copiar sesiones de la semana anterior"
                >
                  Copiar sem. anterior
                </button>
              )}
              <button
                onClick={() => setWeekIdx((i) => Math.min(plan.weeks.length - 1, i + 1))}
                disabled={weekIdx === plan.weeks.length - 1}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Week mini-overview */}
          <WeekNav weeks={plan.weeks} activeIdx={weekIdx} onSelect={setWeekIdx} />

          {/* Phase label + edit */}
          <div className="mb-4 flex items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: PHASE_COLORS[week!.phase] ?? '#1e3a5f' }}
            >
              {week!.phase}
            </span>
            {week!.focusDescription && (
              <span className="text-xs text-gray-400">· {week!.focusDescription}</span>
            )}
            {week!.isRecoveryWeek && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Recuperación
              </span>
            )}
            <button
              onClick={() => setWeekEdit({ weekId: week!.id, phase: week!.phase, focusDescription: week!.focusDescription ?? '', isRecoveryWeek: week!.isRecoveryWeek, volumeKm: week!.volumeKm ?? null })}
              className="text-gray-300 hover:text-gray-600 transition-colors ml-1"
              title="Editar metadatos de semana"
            >
              <Pencil size={12} />
            </button>
          </div>

          {/* 7-day grid */}
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES.map((dayName, dayIdx) => {
              const sessions = week!.sessions.filter((s) => s.dayOfWeek === dayIdx)
              const date = dayDate(week!.startDate, dayIdx)
              return (
                <div key={dayIdx} className="min-h-[260px] flex flex-col">
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">{dayName}</p>
                    <p className="text-xl font-bold text-gray-900 leading-tight">{date.getDate()}</p>
                    <div className="h-px bg-gray-200 mt-1" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {sessions.map((s) => {
                      const cfg = getSessionConfig(s.type)
                      return (
                        <button
                          key={s.id}
                          onClick={() => openEditModal(s, week!.id)}
                          className="w-full text-left p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div
                            className="h-0.5 rounded-full mb-1.5"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <p className="text-xs font-semibold text-gray-900 leading-tight">
                            {cfg.label}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {s.durationMin} min{s.zoneTarget && s.zoneTarget !== 'N/A' && s.type !== 'FUERZA' ? ` · ${s.zoneTarget}` : ''}
                          </p>
                          {s.sportLabel && (
                            <p className="text-[10px] text-blue-500 mt-0.5 truncate font-medium">
                              {s.sportLabel}
                            </p>
                          )}
                          {s.detailText && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                              {s.detailText}
                            </p>
                          )}
                          {s.type === 'FUERZA' && s.workoutDay && (
                            <p className="text-[10px] text-purple-500 mt-0.5 truncate font-medium">
                              💪 {s.workoutDay.label}
                            </p>
                          )}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => openAddModal(week!.id, dayIdx)}
                      className="w-full py-2 text-xs text-gray-300 hover:text-gray-500 hover:bg-white rounded-lg border border-dashed border-gray-200 transition-colors"
                    >
                      + Añadir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* WeekNav — mini-overview */}
          <div className="mt-8 border-t border-gray-100 pt-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Semanas del plan
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plan.weeks.map((w, i) => {
                const sessionCount = w.sessions.length
                const phaseColor = PHASE_COLORS[w.phase] ?? '#9ca3af'
                const isActive = i === weekIdx
                return (
                  <button
                    key={w.id}
                    onClick={() => setWeekIdx(i)}
                    title={`Sem ${w.weekNumber} — ${w.phase}${w.isRecoveryWeek ? ' · Recuperación' : ''} · ${sessionCount} sesiones`}
                    className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all"
                    style={{
                      borderColor: isActive ? phaseColor : '#e5e7eb',
                      backgroundColor: isActive ? `${phaseColor}10` : 'white',
                      minWidth: 36,
                    }}
                  >
                    <span
                      className="text-[10px] font-bold leading-none"
                      style={{ color: isActive ? phaseColor : '#9ca3af' }}
                    >
                      {w.weekNumber}
                    </span>
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: sessionCount > 0 ? phaseColor : '#e5e7eb' }}
                    />
                    {w.isRecoveryWeek && (
                      <div className="w-1 h-1 rounded-full bg-amber-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Session modal */}
      {modal && (
        <SessionModal
          modal={modal}
          onSave={handleSaveSession}
          onDelete={modal.session ? () => handleDeleteSession(modal.session!.id) : undefined}
          onClose={() => setModal(null)}
          saving={saving}
          gymTemplates={gymTemplates}
        />
      )}

      {/* Week metadata modal */}
      {weekEdit && (
        <WeekEditModal
          state={weekEdit}
          onSave={handleSaveWeekMeta}
          onClose={() => setWeekEdit(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────

function BuilderHeader({
  athleteId,
  athleteName,
  planName,
}: {
  athleteId: string
  athleteName: string
  planName?: string
}) {
  return (
    <header className="flex items-center justify-between px-6 h-16 border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href="/coach/athletes" className="font-black text-xl tracking-tight shrink-0">
          <span style={{ color: '#1e3a5f' }}>Medal</span>
          <span style={{ color: '#f97316' }}>iq</span>
        </Link>
        <span className="text-gray-300">·</span>
        <span className="text-sm text-gray-400 shrink-0">Constructor de planes</span>
        <span className="text-gray-300">·</span>
        <span className="text-sm font-semibold text-gray-800 truncate">{athleteName}</span>
        {planName && (
          <>
            <span className="text-gray-300 shrink-0">·</span>
            <span className="text-sm text-gray-400 truncate">{planName}</span>
          </>
        )}
      </div>
      <Link
        href={`/coach/athlete/${athleteId}`}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0 ml-4"
      >
        <ChevronLeft size={15} />
        Volver al panel
      </Link>
    </header>
  )
}

// ── Session modal ─────────────────────────────────────────────────────────────

function SessionModal({
  modal,
  onSave,
  onDelete,
  onClose,
  saving,
  gymTemplates,
}: {
  modal: ModalState
  onSave: (data: { type: string; durationMin: number; zoneTarget: string; detailText: string; sportLabel: string; workoutDayId: string | null }) => void
  onDelete?: () => void
  onClose: () => void
  saving: boolean
  gymTemplates: GymTemplate[]
}) {
  const [type, setType] = useState(modal.session?.type ?? modal.preselectedType ?? 'RODAJE_Z2')
  const [durationMin, setDurationMin] = useState(modal.session?.durationMin ?? 45)
  const [zoneTarget, setZoneTarget] = useState(modal.session?.zoneTarget ?? '')
  const [detailText, setDetailText] = useState(modal.session?.detailText ?? '')
  const [sportLabel, setSportLabel] = useState(modal.session?.sportLabel ?? '')
  const [workoutDayId, setWorkoutDayId] = useState<string | null>(modal.session?.workoutDayId ?? null)

  const allGymDays = gymTemplates.flatMap(t => t.days.map(d => ({ ...d, templateName: t.name })))
  const selectedGymDay = allGymDays.find(d => d.id === workoutDayId) ?? null
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isEdit = !!modal.session
  const dayName = DAY_NAMES[modal.dayOfWeek]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {isEdit ? 'Editar sesión' : `Añadir sesión — ${dayName}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Type selector */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Tipo de sesión
            </p>
            <div className="grid grid-cols-2 gap-1">
              {SESSION_TYPES.map((st) => (
                <button
                  key={st.type}
                  onClick={() => setType(st.type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    type === st.type
                      ? 'bg-gray-100 font-semibold text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Duración (min)
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {[30, 45, 60, 75, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationMin(d)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={
                    durationMin === d
                      ? { backgroundColor: '#1e3a5f', color: '#fff', fontWeight: 600 }
                      : { backgroundColor: '#f3f4f6', color: '#374151' }
                  }
                >
                  {d}
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={300}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1"
                style={{ '--tw-ring-color': '#1e3a5f' } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Zone */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Zona objetivo
            </p>
            <input
              type="text"
              value={zoneTarget}
              onChange={(e) => setZoneTarget(e.target.value)}
              placeholder="Ej: Z2, Umbral, 80-85% FCM"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* WorkoutDay picker — only when FUERZA */}
          {type === 'FUERZA' && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Rutina de gym
              </p>
              {allGymDays.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay rutinas creadas todavía. Crea una en Gym → Rutinas.</p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  <button
                    onClick={() => setWorkoutDayId(null)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={workoutDayId === null ? { backgroundColor: '#f3f4f6', fontWeight: 600, color: '#374151' } : { color: '#9ca3af' }}
                  >
                    Sin rutina asignada
                  </button>
                  {allGymDays.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setWorkoutDayId(d.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                      style={workoutDayId === d.id ? { backgroundColor: '#f3e8ff', fontWeight: 600, color: '#7c3aed' } : { color: '#374151', backgroundColor: '#f9fafb' }}
                    >
                      <span className="font-medium">{d.label}</span>
                      <span className="text-xs text-gray-400 ml-1">— {d.templateName}</span>
                      {workoutDayId === d.id && (
                        <p className="text-xs text-purple-500 mt-0.5">
                          {d.exercises.map(e => `${e.name} ${e.sets}×${e.repsScheme}`).join(' · ')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sport label — free-form tag visible on the card */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Etiqueta de deporte <span className="text-gray-300 font-normal normal-case">(opcional)</span>
            </p>
            <input
              type="text"
              value={sportLabel}
              onChange={(e) => setSportLabel(e.target.value)}
              placeholder="Ej: Sweet Spot 2×20min, CSS 400m × 8"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Descripción
            </p>
            <textarea
              value={detailText}
              onChange={(e) => setDetailText(e.target.value)}
              placeholder="Ej: 3×10min al umbral con 3min de recuperación"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          {isEdit && onDelete && (
            <button
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              className="text-sm font-medium transition-colors"
              style={{ color: confirmDelete ? '#dc2626' : '#9ca3af' }}
            >
              {confirmDelete ? '¿Confirmar?' : 'Eliminar'}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ type, durationMin, zoneTarget, detailText, sportLabel, workoutDayId: type === 'FUERZA' ? workoutDayId : null })}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Añadir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Week metadata modal ───────────────────────────────────────────────────────

function WeekEditModal({
  state,
  onSave,
  onClose,
  saving,
}: {
  state: WeekEditState
  onSave: (data: { phase: string; focusDescription: string; isRecoveryWeek: boolean; volumeKm: number | null }) => void
  onClose: () => void
  saving: boolean
}) {
  const [phase, setPhase] = useState(state.phase)
  const [focusDescription, setFocusDescription] = useState(state.focusDescription)
  const [isRecoveryWeek, setIsRecoveryWeek] = useState(state.isRecoveryWeek)
  const [volumeKmStr, setVolumeKmStr] = useState(state.volumeKm != null ? String(state.volumeKm) : '')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Editar semana</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Phase */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Fase</p>
            <div className="grid grid-cols-2 gap-1">
              {PHASES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className="px-3 py-2 rounded-lg text-sm text-left transition-colors"
                  style={
                    phase === p
                      ? { backgroundColor: `${PHASE_COLORS[p]}15`, color: PHASE_COLORS[p], fontWeight: 600 }
                      : { backgroundColor: '#f9fafb', color: '#6b7280' }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Focus description */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Descripción de enfoque
            </p>
            <input
              type="text"
              value={focusDescription}
              onChange={(e) => setFocusDescription(e.target.value)}
              placeholder="Ej: Construcción aeróbica + fuerza base"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Volume km */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Volumen objetivo (km)
            </p>
            <input
              type="number"
              min={0}
              step={1}
              value={volumeKmStr}
              onChange={(e) => setVolumeKmStr(e.target.value)}
              placeholder="Ej: 50"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Recovery week toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Semana de recuperación</span>
            <button
              onClick={() => setIsRecoveryWeek((v) => !v)}
              className="relative w-10 h-6 rounded-full transition-colors"
              style={{ backgroundColor: isRecoveryWeek ? '#f97316' : '#d1d5db' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: isRecoveryWeek ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ phase, focusDescription, isRecoveryWeek, volumeKm: volumeKmStr ? Number(volumeKmStr) : null })}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── WeekNav ───────────────────────────────────────────────────────────────────

function WeekNav({
  weeks,
  activeIdx,
  onSelect,
}: {
  weeks: BuilderWeek[]
  activeIdx: number
  onSelect: (idx: number) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 mb-4 px-1">
      {weeks.map((w, i) => {
        const isActive = i === activeIdx
        const color = PHASE_COLORS[w.phase] ?? '#1e3a5f'
        const count = w.sessions.length
        return (
          <button
            key={w.id}
            onClick={() => onSelect(i)}
            title={`Semana ${w.weekNumber} — ${w.phase}${w.isRecoveryWeek ? ' · Recuperación' : ''} · ${count} sesiones`}
            className="flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-lg transition-all shrink-0 min-w-[32px]"
            style={isActive ? { backgroundColor: color + '18', outline: `2px solid ${color}` } : { outline: '2px solid transparent' }}
          >
            <span className="text-[8px] font-bold text-gray-400 leading-none">S{w.weekNumber}</span>
            <span
              className="w-2 h-2 rounded-full transition-transform"
              style={{
                backgroundColor: count > 0 ? color : '#e5e7eb',
                transform: isActive ? 'scale(1.25)' : 'scale(1)',
              }}
            />
            {w.isRecoveryWeek && (
              <span className="w-1 h-1 rounded-full bg-amber-400 -mt-0.5" />
            )}
          </button>
        )
      })}
    </div>
  )
}
