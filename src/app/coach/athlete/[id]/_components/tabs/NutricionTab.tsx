'use client'

import Link from 'next/link'
import type { NutritionPlanData, ActivePlanData, HealthProfileData } from '../AthleteDetailClient'
import { FoodLogsSection, type FoodLogEntry } from '../FoodLogsSection'
import NutritionAdherenceCard, { type DayAdherence } from '../NutritionAdherenceCard'
import CoachPlannedMealPlanner from '../CoachPlannedMealPlanner'
import Stat from '../Stat'

type MealPlanData = { data: unknown; updatedAt: string } | null
type FoodProfileData = {
  availableFoods: string[]
  availableFoodIds: string[]
  restrictions: string[]
  mealsPerDay: number
  weighsFood: boolean
  notes: string | null
} | null

const PHASE_KCAL_DELTA: Record<string, { label: string; delta: number; desc: string }> = {
  BASE:        { label: 'BASE',        delta: -200, desc: 'Déficit leve (−200 kcal)' },
  DESARROLLO:  { label: 'DESARROLLO',  delta:    0, desc: 'Mantenimiento' },
  ESPECIFICO:  { label: 'ESPECÍFICO',  delta: +100, desc: 'Superávit leve (+100 kcal)' },
  AFINAMIENTO: { label: 'AFINAMIENTO', delta: -100, desc: 'Reducción leve (−100 kcal)' },
}

interface NutricionTabProps {
  athleteId: string
  nutritionPlan: NutritionPlanData
  activePlan: ActivePlanData
  healthProfile: HealthProfileData
  editingNutrition: boolean
  setEditingNutrition: (v: boolean) => void
  nutritionDraft: NutritionPlanData
  setNutritionDraft: (fn: (prev: NutritionPlanData) => NutritionPlanData) => void
  savingNutrition: boolean
  nutritionSaveError: string | null
  foodProfile: FoodProfileData | null
  foodLogs: FoodLogEntry[]
  nutritionExtLoaded: boolean
  adherenceData: DayAdherence[]
  selfReportedAdherencePct: number | null
  assignedTemplate: {
    id: string; templateId: string; assignedAt: string
    template: { id: string; name: string; goal: string | null }
  } | null
  templateTotals: Record<string, { kcal: number; proteinG: number; carbsG: number; fatG: number }> | null
  applyingTemplate: boolean
  handleApplyTemplate: () => void
  plannerKey: number
  setPlannerKey: (fn: (k: number) => number) => void
  handleSaveNutrition: () => void
  applyPhaseTargets: () => void
  currentPhase: string | null
}

export default function NutricionTab({
  athleteId,
  nutritionPlan,
  activePlan,
  healthProfile,
  editingNutrition,
  setEditingNutrition,
  nutritionDraft,
  setNutritionDraft,
  savingNutrition,
  nutritionSaveError,
  foodProfile,
  foodLogs,
  nutritionExtLoaded,
  adherenceData,
  selfReportedAdherencePct,
  assignedTemplate,
  templateTotals,
  applyingTemplate,
  handleApplyTemplate,
  plannerKey,
  handleSaveNutrition,
  applyPhaseTargets,
  currentPhase,
}: NutricionTabProps) {
  return (
    <div className="space-y-6">
      {/* Plan nutricional asignado (template) */}
      {assignedTemplate ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Plan nutricional asignado</h2>
            <span className="text-xs text-gray-400">
              Asignado el {new Date(assignedTemplate.assignedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-800">{assignedTemplate.template.name}</span>
            {assignedTemplate.template.goal && (
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#1e3a5f' }}>
                {assignedTemplate.template.goal}
              </span>
            )}
          </div>
          {templateTotals && (
            <div className="space-y-1.5 mb-4">
              {(['HARD', 'EASY', 'REST'] as const).map(dayType => {
                const t = templateTotals[dayType]
                if (!t) return null
                const labels: Record<string, string> = { HARD: 'Día duro', EASY: 'Día fácil', REST: 'Descanso' }
                return (
                  <div key={dayType} className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-gray-700 w-20">{labels[dayType]}</span>
                    <span className="text-gray-600">{t.kcal} kcal</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">P {t.proteinG}g</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">C {t.carbsG}g</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">F {t.fatG}g</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/coach/nutrition/templates/${assignedTemplate.template.id}/build`}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Editar template
            </Link>
            <Link
              href="/coach/nutrition"
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Asignar otro
            </Link>
            <button
              disabled={applyingTemplate}
              onClick={handleApplyTemplate}
              className="text-xs px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#ea580c' }}
            >
              {applyingTemplate ? 'Aplicando...' : 'Aplicar a esta semana'}
            </button>
          </div>
        </div>
      ) : nutritionExtLoaded ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-medium text-gray-700 mb-1">Sin template de comidas asignado</p>
          <p className="text-xs text-gray-400 mb-3">
            Los targets calóricos ya están calculados (ver abajo). Un template define las comidas específicas del atleta día a día.
          </p>
          <Link
            href="/coach/nutrition"
            className="inline-block text-xs px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Asignar template de comidas
          </Link>
        </div>
      ) : null}

      {/* Planner semanal */}
      <CoachPlannedMealPlanner key={plannerKey} athleteId={athleteId} />

      {!nutritionPlan ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-400">El atleta aún no tiene targets calóricos generados. Completa el onboarding para calcular TDEE y macros.</p>
        </div>
      ) : (
        <>
          {/* TDEE & targets */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Targets calóricos</h2>
              {!editingNutrition && (
                <button
                  onClick={() => { setNutritionDraft(_p => nutritionPlan); setEditingNutrition(true) }}
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

          {/* Macros */}
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

          {/* Adherencia nutricional */}
          {!editingNutrition && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Adherencia nutricional</h2>
              <NutritionAdherenceCard data={adherenceData} loaded={nutritionExtLoaded} selfReportedPct={selfReportedAdherencePct} />
            </div>
          )}

          {/* Logs de alimentos */}
          {!editingNutrition && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Registro alimenticio — últimos 7 días</h2>
              <FoodLogsSection
                foodLogs={foodLogs}
                nutritionPlan={nutritionPlan}
                loaded={nutritionExtLoaded}
                athleteId={athleteId}
              />
            </div>
          )}

          {!editingNutrition && !nutritionExtLoaded && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-400">Cargando plan de comidas...</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
