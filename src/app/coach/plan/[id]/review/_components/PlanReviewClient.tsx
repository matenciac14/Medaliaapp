'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionData = {
  id: string
  dayOfWeek: number
  type: string
  durationMin: number
  detailText: string | null
  zoneTarget: string | null
  coachNote: string | null
}

export type WeekData = {
  id: string
  weekNumber: number
  phase: string
  focusDescription: string | null
  isRecoveryWeek: boolean
  volumeKm: number | null
  sessions: SessionData[]
}

export type PlanData = {
  id: string
  name: string
  totalWeeks: number
  startDate: string
  endDate: string
  status: string
  generatedBy: string
  weeks: WeekData[]
  user: {
    id: string
    name: string | null
    email: string
  }
}

// ─── Lookup maps ──────────────────────────────────────────────────────────────

const DAY_ABBR: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
}

const SESSION_LABELS: Record<string, string> = {
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

// Badge styles per session type
const SESSION_BADGE: Record<string, { bg: string; text: string }> = {
  RODAJE_Z2:    { bg: '#dbeafe', text: '#1d4ed8' },
  FARTLEK:      { bg: '#f3e8ff', text: '#7e22ce' },
  TEMPO:        { bg: '#ffedd5', text: '#c2410c' },
  INTERVALOS:   { bg: '#fee2e2', text: '#b91c1c' },
  TIRADA_LARGA: { bg: '#e0e7ff', text: '#3730a3' },
  FUERZA:       { bg: '#fef3c7', text: '#92400e' },
  DESCANSO:     { bg: '#f3f4f6', text: '#4b5563' },
  TEST:         { bg: '#fce7f3', text: '#9d174d' },
  SIMULACRO:    { bg: '#ccfbf1', text: '#0f766e' },
  CICLA:        { bg: '#dcfce7', text: '#15803d' },
  NATACION:     { bg: '#cffafe', text: '#0e7490' },
  OTRO:         { bg: '#f3f4f6', text: '#4b5563' },
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  ACTIVE:    'Activo',
  PAUSED:    'Pausado',
  COMPLETED: 'Completado',
  ABANDONED: 'Abandonado',
}

const GENERATED_BY_LABEL: Record<string, { label: string; bg: string; text: string; border: string }> = {
  AI:                { label: 'Generado por AI', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  COACH:             { label: 'Creado por coach', bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0' },
  AI_COACH_APPROVED: { label: 'Aprobado por coach', bg: '#f0fdf4', text: '#14532d', border: '#86efac' },
}

const PHASES = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  plan: PlanData
  athleteId: string
}

export default function PlanReviewClient({ plan, athleteId }: Props) {
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    plan.weeks.forEach((w) =>
      w.sessions.forEach((s) => {
        if (s.coachNote) init[s.id] = s.coachNote
      })
    )
    return init
  })
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({})
  const [savedNote, setSavedNote] = useState<Record<string, boolean>>({})

  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(plan.generatedBy === 'AI_COACH_APPROVED')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [adjustComment, setAdjustComment] = useState('')

  // Group weeks by phase
  const weeksByPhase = PHASES.map((phase) => ({
    phase,
    weeks: plan.weeks.filter((w) => w.phase === phase),
  })).filter((g) => g.weeks.length > 0)

  function togglePhase(phase: string) {
    setCollapsedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }))
  }

  async function handleSaveNote(sessionId: string) {
    setSavingNote((prev) => ({ ...prev, [sessionId]: true }))
    try {
      await fetch(`/api/coach/sessions/${sessionId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes[sessionId] ?? '' }),
      })
      setSavedNote((prev) => ({ ...prev, [sessionId]: true }))
    } finally {
      setSavingNote((prev) => ({ ...prev, [sessionId]: false }))
    }
  }

  async function handleApprove() {
    setApproving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/coach/plan/${plan.id}/approve`, {
        method: 'PATCH',
      })
      const data = await res.json() as { ok: boolean }
      if (res.ok && data.ok) {
        setApproved(true)
        setFeedback({ type: 'success', message: 'Plan aprobado. Los cambios se guardaron en la base de datos.' })
      } else {
        setFeedback({ type: 'error', message: 'Error al aprobar el plan. Intenta de nuevo.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión. Intenta de nuevo.' })
    } finally {
      setApproving(false)
    }
  }

  async function handleRequestAdjustment() {
    if (!adjustComment.trim()) return
    setApproving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/coach/plan/${plan.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_adjustment', comment: adjustComment }),
      })
      const data = await res.json() as { ok: boolean }
      if (res.ok && data.ok) {
        setShowAdjustForm(false)
        setAdjustComment('')
        setFeedback({ type: 'success', message: 'Solicitud de ajuste registrada.' })
      } else {
        setFeedback({ type: 'error', message: 'Error al enviar la solicitud.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión.' })
    } finally {
      setApproving(false)
    }
  }

  const athleteName = plan.user.name ?? plan.user.email
  const initials = athleteName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const statusCfg = GENERATED_BY_LABEL[approved ? 'AI_COACH_APPROVED' : plan.generatedBy] ?? GENERATED_BY_LABEL.AI

  const startDate = new Date(plan.startDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  const endDate = new Date(plan.endDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ── Sticky header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href={`/coach/athlete/${athleteId}`}
              className="flex-shrink-0 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← Volver
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{athleteName}</p>
                <p className="text-xs text-gray-500 truncate">{plan.name}</p>
              </div>
            </div>
          </div>
          {/* Approval status badge */}
          <span
            className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.text, borderColor: statusCfg.border }}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* ── Plan meta ─────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Total semanas</p>
              <p className="font-semibold text-gray-800">{plan.totalWeeks}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Inicio</p>
              <p className="font-semibold text-gray-800">{startDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Fin</p>
              <p className="font-semibold text-gray-800">{endDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Estado</p>
              <p className="font-semibold text-gray-800">{PLAN_STATUS_LABEL[plan.status] ?? plan.status}</p>
            </div>
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div
            className="mb-6 px-4 py-3 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.type === 'success' ? '#14532d' : '#7f1d1d',
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* ── Phases + weeks ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {weeksByPhase.map(({ phase, weeks }) => {
            const collapsed = collapsedPhases[phase]
            return (
              <div key={phase} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Phase header */}
                <button
                  onClick={() => togglePhase(phase)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#f97316' }} />
                    <span className="font-semibold text-gray-900">{phase}</span>
                    <span className="text-xs text-gray-400">{weeks.length} semana{weeks.length !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{collapsed ? '▼ Expandir' : '▲ Colapsar'}</span>
                </button>

                {!collapsed && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {weeks.map((week) => (
                      <div key={week.id} className="px-5 py-4">
                        {/* Week header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>
                            Semana {week.weekNumber}
                          </span>
                          {week.isRecoveryWeek && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                              Descarga
                            </span>
                          )}
                          {week.volumeKm != null && (
                            <span className="text-xs text-gray-400 ml-auto">{week.volumeKm} km</span>
                          )}
                        </div>
                        {week.focusDescription && (
                          <p className="text-xs text-gray-500 mb-3">{week.focusDescription}</p>
                        )}

                        {/* Sessions */}
                        <div className="space-y-4">
                          {week.sessions.map((session) => {
                            const badge = SESSION_BADGE[session.type] ?? SESSION_BADGE.OTRO
                            const label = SESSION_LABELS[session.type] ?? session.type
                            const isSaving = savingNote[session.id]
                            const isSaved = savedNote[session.id]

                            return (
                              <div
                                key={session.id}
                                className="border-l-2 pl-4"
                                style={{ borderColor: '#f97316' }}
                              >
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-400 uppercase w-8 flex-shrink-0">
                                    {DAY_ABBR[session.dayOfWeek] ?? `D${session.dayOfWeek}`}
                                  </span>
                                  <span
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: badge.bg, color: badge.text }}
                                  >
                                    {label}
                                  </span>
                                  <span className="text-xs text-gray-400">{session.durationMin} min</span>
                                  {session.zoneTarget && (
                                    <span className="text-xs text-blue-500">{session.zoneTarget}</span>
                                  )}
                                </div>
                                {session.detailText && (
                                  <p className="text-xs text-gray-500 mb-2 ml-10">{session.detailText}</p>
                                )}

                                {/* Coach note textarea */}
                                <div className="flex gap-2 items-start ml-10">
                                  <textarea
                                    rows={2}
                                    placeholder="Nota del coach..."
                                    value={notes[session.id] ?? ''}
                                    onChange={(e) => {
                                      setNotes((prev) => ({ ...prev, [session.id]: e.target.value }))
                                      setSavedNote((prev) => ({ ...prev, [session.id]: false }))
                                    }}
                                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-700 placeholder-gray-300"
                                  />
                                  <button
                                    onClick={() => handleSaveNote(session.id)}
                                    disabled={isSaving}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                                    style={{ backgroundColor: isSaved ? '#16a34a' : '#1e3a5f' }}
                                  >
                                    {isSaving ? '...' : isSaved ? '✓ Guardado' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                          {week.sessions.length === 0 && (
                            <p className="text-xs text-gray-400">Sin sesiones planificadas.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {weeksByPhase.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-gray-400 text-sm">Este plan no tiene semanas generadas aún.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {showAdjustForm ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Comentario para el atleta
              </label>
              <textarea
                rows={3}
                placeholder="Describe los ajustes necesarios..."
                value={adjustComment}
                onChange={(e) => setAdjustComment(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 text-gray-700 placeholder-gray-400"
                style={{ '--tw-ring-color': '#f97316' } as React.CSSProperties}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAdjustForm(false); setAdjustComment('') }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestAdjustment}
                  disabled={approving || !adjustComment.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  {approving ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdjustForm(true)}
                disabled={approving || approved}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors disabled:opacity-40"
                style={{ borderColor: '#dc2626', color: '#dc2626' }}
              >
                Solicitar ajuste
              </button>
              <button
                onClick={handleApprove}
                disabled={approving || approved}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: approved ? '#16a34a' : '#1e3a5f' }}
              >
                {approving ? 'Aprobando...' : approved ? '✓ Plan aprobado' : 'Aprobar plan'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
