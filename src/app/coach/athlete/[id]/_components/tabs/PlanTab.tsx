'use client'

import Link from 'next/link'
import type { ActivePlanData, HealthProfileData } from '../AthleteDetailClient'

const DAY_NAMES: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2', FARTLEK: 'Fartlek', TEMPO: 'Tempo', INTERVALOS: 'Intervalos',
  TIRADA_LARGA: 'Tirada larga', FUERZA: 'Fuerza', CICLA: 'Ciclismo', NATACION: 'Natación',
  DESCANSO: 'Descanso', TEST: 'Test', SIMULACRO: 'Simulacro', OTRO: 'Otro',
}

const TEMPLATE_PREVIEW: Record<string, { weeks: number; description: string; phases: string[] }> = {
  RACE_5K:            { weeks: 8,  description: 'Intervalos progresivos + fartlek semanal.', phases: ['BASE 3 sem', 'DESARROLLO 3 sem', 'AFINAMIENTO 2 sem'] },
  RACE_10K:           { weeks: 12, description: 'Volumen aeróbico + tempo runs y series.', phases: ['BASE 4 sem', 'DESARROLLO 5 sem', 'ESPECÍFICO 2 sem', 'AFINAMIENTO 1 sem'] },
  STRENGTH_TRAINING:  { weeks: 16, description: 'Splits Push/Pull/Legs con progresión de cargas.', phases: ['BASE 4 sem', 'DESARROLLO 6 sem', 'ESPECÍFICO 4 sem', 'AFINAMIENTO 2 sem'] },
  BODY_RECOMPOSITION: { weeks: 16, description: 'Fuerza + cardio moderado para recomposición.', phases: ['BASE 4 sem', 'DESARROLLO 6 sem', 'ESPECÍFICO 4 sem', 'AFINAMIENTO 2 sem'] },
}

const INTENSITY_SCORE: Record<string, number> = { HIGH: 3, MODERATE: 2, LOW: 1, REST: 0 }

function weekLoadScore(sessions: { intensity: string }[]) {
  return sessions.reduce((sum, s) => sum + (INTENSITY_SCORE[s.intensity] ?? 2), 0)
}

type SessionDraft = { durationMin: number; type: string; zoneTarget: string; detailText: string; structure: string }

interface PlanTabProps {
  athleteId: string
  activePlan: ActivePlanData
  healthProfile: HealthProfileData
  creatingPlan: boolean
  setCreatingPlan: (v: boolean) => void
  planGoalType: string
  setPlanGoalType: (v: string) => void
  planDaysPerWeek: number
  setPlanDaysPerWeek: (v: number) => void
  planGenerating: boolean
  planError: string | null
  planMode: 'template' | 'copy'
  setPlanMode: (v: 'template' | 'copy') => void
  copySourcePlanId: string
  setCopySourcePlanId: (v: string) => void
  copyStartDate: string
  setCopyStartDate: (v: string) => void
  availablePlans: { planId: string; planName: string; totalWeeks: number; athleteName: string; status: string }[]
  loadingPlans: boolean
  loadAvailablePlans: () => void
  handleCopyPlan: () => void
  handleCreatePlan: () => void
  planViewWeekIdx: number
  setPlanViewWeekIdx: (fn: (i: number) => number) => void
  notes: Record<string, string>
  savedNotes: Record<string, boolean>
  savingNotes: Record<string, boolean>
  editingSession: string | null
  setEditingSession: (id: string | null) => void
  sessionDraft: SessionDraft
  setSessionDraft: (fn: (d: SessionDraft) => SessionDraft) => void
  savingSession: boolean
  handleNoteChange: (sessionId: string, value: string) => void
  handleSaveNote: (sessionId: string) => void
  handleSaveSession: (sessionId: string) => void
}

export default function PlanTab({
  athleteId,
  activePlan,
  healthProfile,
  creatingPlan,
  setCreatingPlan,
  planGoalType,
  setPlanGoalType,
  planDaysPerWeek,
  setPlanDaysPerWeek,
  planGenerating,
  planError,
  planMode,
  setPlanMode,
  copySourcePlanId,
  setCopySourcePlanId,
  copyStartDate,
  setCopyStartDate,
  availablePlans,
  loadingPlans,
  loadAvailablePlans,
  handleCopyPlan,
  handleCreatePlan,
  planViewWeekIdx,
  setPlanViewWeekIdx,
  notes,
  savedNotes,
  savingNotes,
  editingSession,
  setEditingSession,
  sessionDraft,
  setSessionDraft,
  savingSession,
  handleNoteChange,
  handleSaveNote,
  handleSaveSession,
}: PlanTabProps) {
  return (
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
                  <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Recuperación</span>
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
                              setSessionDraft((_d) => ({
                                durationMin: session.durationMin,
                                type: session.type,
                                zoneTarget: session.zoneTarget ?? '',
                                detailText: session.detailText ?? '',
                                structure: session.structure ?? '',
                              }))
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
  )
}
