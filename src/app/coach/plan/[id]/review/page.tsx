'use client'

import { useState } from 'react'
import Link from 'next/link'
import { mockAthletes } from '@/lib/mock/coach-data'
import { mockPlan, mockWeeks } from '@/lib/mock/dashboard-data'

type PlanStatus = 'PENDIENTE' | 'APROBADO' | 'AJUSTE_SOLICITADO'

const STATUS_CONFIG: Record<PlanStatus, { label: string; bg: string; text: string; border: string }> = {
  PENDIENTE: { label: 'Pendiente', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  APROBADO: { label: 'Aprobado', bg: '#dcfce7', text: '#14532d', border: '#86efac' },
  AJUSTE_SOLICITADO: { label: 'Ajuste solicitado', bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' },
}

const PHASES = ['BASE', 'DESARROLLO', 'ESPECÍFICO', 'AFINAMIENTO']

type EditState = {
  weekIndex: number
  sessionIndex: number
  field: 'type' | 'notes'
  value: string
}

type SessionOverride = {
  type?: string
  notes?: string
}

export default function PlanReviewPage({ params }: { params: { id: string } }) {
  const athlete = mockAthletes[0]
  const plan = mockPlan

  const [planStatus, setPlanStatus] = useState<PlanStatus>('PENDIENTE')
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({})
  const [editState, setEditState] = useState<EditState | null>(null)
  const [sessionOverrides, setSessionOverrides] = useState<Record<string, SessionOverride>>({})
  const [adjustmentComment, setAdjustmentComment] = useState('')
  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const weeksByPhase = PHASES.map((phase) => ({
    phase,
    weeks: mockWeeks.filter((w) => w.phase === phase),
  })).filter((g) => g.weeks.length > 0)

  function togglePhase(phase: string) {
    setCollapsedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }))
  }

  function overrideKey(weekIndex: number, sessionIndex: number) {
    return `${weekIndex}-${sessionIndex}`
  }

  function startEdit(weekIndex: number, sessionIndex: number, field: 'type' | 'notes', currentValue: string) {
    setEditState({ weekIndex, sessionIndex, field, value: currentValue })
  }

  function commitEdit() {
    if (!editState) return
    const key = overrideKey(editState.weekIndex, editState.sessionIndex)
    setSessionOverrides((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [editState.field]: editState.value,
      },
    }))
    setEditState(null)
  }

  function cancelEdit() {
    setEditState(null)
  }

  async function handleApprove() {
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/coach/plan/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json() as { ok: boolean; status: string }
      if (data.ok) {
        setPlanStatus('APROBADO')
        setShowAdjustForm(false)
        setFeedback({ type: 'success', message: 'Plan aprobado exitosamente.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error al aprobar el plan. Intenta de nuevo.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestAdjustment() {
    if (!adjustmentComment.trim()) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/coach/plan/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_adjustment', comment: adjustmentComment }),
      })
      const data = await res.json() as { ok: boolean; status: string }
      if (data.ok) {
        setPlanStatus('AJUSTE_SOLICITADO')
        setShowAdjustForm(false)
        setFeedback({ type: 'success', message: 'Solicitud de ajuste enviada.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error al enviar la solicitud. Intenta de nuevo.' })
    } finally {
      setSubmitting(false)
    }
  }

  const statusCfg = STATUS_CONFIG[planStatus]

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href={`/coach/athlete/${params.id}`}
              className="flex-shrink-0 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← Volver
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                {athlete.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{athlete.name}</p>
                <p className="text-xs text-gray-500 truncate">{plan.name}</p>
              </div>
            </div>
          </div>
          {/* Status badge */}
          <span
            className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.text, borderColor: statusCfg.border }}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Plan meta */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Total semanas</p>
              <p className="font-semibold text-gray-800">{plan.totalWeeks}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Inicio</p>
              <p className="font-semibold text-gray-800">{plan.startDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Fin</p>
              <p className="font-semibold text-gray-800">{plan.endDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Fase actual</p>
              <p className="font-semibold text-gray-800">{plan.phase}</p>
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

        {/* Phases + weeks */}
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
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#f97316' }}
                    />
                    <span className="font-semibold text-gray-900">{phase}</span>
                    <span className="text-xs text-gray-400">{weeks.length} semanas</span>
                  </div>
                  <span className="text-gray-400 text-xs">{collapsed ? '▼ Expandir' : '▲ Colapsar'}</span>
                </button>

                {!collapsed && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {weeks.map((week, wi) => {
                      const weekIndexGlobal = mockWeeks.indexOf(week)
                      return (
                        <div key={week.weekNumber} className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="text-sm font-semibold"
                              style={{ color: '#1e3a5f' }}
                            >
                              Semana {week.weekNumber}
                            </span>
                            {week.isRecoveryWeek && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                Descarga
                              </span>
                            )}
                            {week.hasTest && (
                              <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                                Test
                              </span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">{week.volumeKm} km</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">{week.focusDescription}</p>

                          {/* Sessions */}
                          <div className="space-y-3">
                            {week.sessions.map((session, si) => {
                              const key = overrideKey(weekIndexGlobal, si)
                              const overrides = sessionOverrides[key] ?? {}
                              const displayType = overrides.type ?? session.label
                              const displayNotes = overrides.notes ?? ''

                              const isEditingType =
                                editState?.weekIndex === weekIndexGlobal &&
                                editState?.sessionIndex === si &&
                                editState?.field === 'type'
                              const isEditingNotes =
                                editState?.weekIndex === weekIndexGlobal &&
                                editState?.sessionIndex === si &&
                                editState?.field === 'notes'

                              return (
                                <div
                                  key={si}
                                  className="border-l-2 pl-4"
                                  style={{ borderColor: '#f97316' }}
                                >
                                  <div className="flex items-start gap-2 mb-1">
                                    <span className="text-xs font-semibold text-gray-400 uppercase w-8 flex-shrink-0 pt-0.5">
                                      {session.day}
                                    </span>
                                    {isEditingType ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <input
                                          autoFocus
                                          type="text"
                                          value={editState.value}
                                          onChange={(e) =>
                                            setEditState((prev) => prev ? { ...prev, value: e.target.value } : null)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitEdit()
                                            if (e.key === 'Escape') cancelEdit()
                                          }}
                                          className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1"
                                          style={{ '--tw-ring-color': '#1e3a5f' } as React.CSSProperties}
                                        />
                                        <button
                                          onClick={commitEdit}
                                          className="text-xs font-medium px-2 py-1 rounded-lg text-white"
                                          style={{ backgroundColor: '#16a34a' }}
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startEdit(weekIndexGlobal, si, 'type', displayType)}
                                        className="text-sm font-medium text-gray-900 hover:underline text-left flex-1"
                                        title="Editar nombre de sesión"
                                      >
                                        {displayType}
                                        <span className="ml-1 text-gray-300 text-xs">✎</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Notes inline edit */}
                                  <div className="ml-10">
                                    {isEditingNotes ? (
                                      <div className="flex gap-2 items-start">
                                        <textarea
                                          autoFocus
                                          rows={2}
                                          value={editState.value}
                                          onChange={(e) =>
                                            setEditState((prev) => prev ? { ...prev, value: e.target.value } : null)
                                          }
                                          className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 text-gray-700"
                                        />
                                        <div className="flex flex-col gap-1">
                                          <button
                                            onClick={commitEdit}
                                            className="text-xs font-medium px-2 py-1 rounded-lg text-white"
                                            style={{ backgroundColor: '#16a34a' }}
                                          >
                                            Guardar
                                          </button>
                                          <button
                                            onClick={cancelEdit}
                                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startEdit(weekIndexGlobal, si, 'notes', displayNotes)}
                                        className="text-xs text-left w-full"
                                      >
                                        {displayNotes ? (
                                          <span className="text-gray-600">
                                            {displayNotes}
                                            <span className="ml-1 text-gray-300">✎</span>
                                          </span>
                                        ) : (
                                          <span className="text-gray-300 italic hover:text-gray-400 transition-colors">
                                            + Añadir nota del coach...
                                          </span>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky footer */}
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
                value={adjustmentComment}
                onChange={(e) => setAdjustmentComment(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 text-gray-700 placeholder-gray-400"
                style={{ '--tw-ring-color': '#f97316' } as React.CSSProperties}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAdjustForm(false)
                    setAdjustmentComment('')
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestAdjustment}
                  disabled={submitting || !adjustmentComment.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  {submitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdjustForm(true)}
                disabled={submitting || planStatus === 'APROBADO'}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors disabled:opacity-40"
                style={{ borderColor: '#dc2626', color: '#dc2626' }}
              >
                Solicitar ajuste
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting || planStatus === 'APROBADO'}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: planStatus === 'APROBADO' ? '#16a34a' : '#1e3a5f' }}
              >
                {submitting ? 'Aprobando...' : planStatus === 'APROBADO' ? '✓ Plan aprobado' : 'Aprobar plan'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
