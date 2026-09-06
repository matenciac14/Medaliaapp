/**
 * Pure business rules for check-in evaluation.
 * Extracted from src/lib/plan/adjustments.ts — NO side effects, NO DB, NO AI.
 * 100% testable with Vitest without any mocks.
 */
import type { CheckInInput, WeekActivitySummary } from './check_in.types'
import { CHECK_IN_THRESHOLDS } from './check_in.types'

export type CheckInContext = {
  hrRestingBaseline?: number        // FC reposo del check-in anterior (dynamic, not hardcoded 62)
  phase: string                     // e.g. 'BASE', 'DESARROLLO', 'AFINAMIENTO'
  currentWeek: number
  totalWeeks: number
  previousWeight?: number           // kg — to detect rapid weight loss
  sport?: string                    // 'RUNNING' | 'STRENGTH' | undefined
  hasGymPlan?: boolean              // true if athlete has an active assigned workout
  consecutiveLowEnergyWeeks?: number // for GYM_DELOAD suggestion
  weekActivity?: WeekActivitySummary // objective training data from SessionLog + GymSession
}

export type RuleEvaluation = {
  triggers: string[]
  adjustments: string[]
  severity: 'ok' | 'warning' | 'critical'
}

/**
 * Deterministic check-in rule evaluation.
 * Returns triggers and adjustments — no DB writes, no AI calls.
 */
export function evaluateCheckInRules(
  checkIn: CheckInInput,
  context: CheckInContext
): RuleEvaluation {
  const triggers: string[] = []
  const adjustments: string[] = []
  let severity: 'ok' | 'warning' | 'critical' = 'ok'

  // FC reposo alta: >10% sobre la FC previa del atleta (dynamic baseline, NOT hardcoded 62)
  const fcBaseline = context.hrRestingBaseline ?? 62
  if (checkIn.heartRate && checkIn.heartRate > fcBaseline * 1.1) {
    triggers.push('fc_alta')
    adjustments.push('Reducir intensidad de sesiones de calidad esta semana')
    severity = 'warning'
  }

  // Sueño insuficiente
  if (checkIn.sleepHours !== undefined && checkIn.sleepHours < CHECK_IN_THRESHOLDS.LOW_SLEEP) {
    triggers.push('sueno_bajo')
    adjustments.push('Priorizar descanso — convertir una sesión de calidad en rodaje suave')
    severity = 'warning'
  }

  // RPE muy alto en fase BASE (running)
  if (
    checkIn.rpe !== undefined &&
    checkIn.rpe >= CHECK_IN_THRESHOLDS.HIGH_RPE &&
    context.phase === 'BASE' &&
    !context.hasGymPlan
  ) {
    triggers.push('rpe_excesivo')
    adjustments.push('La intensidad está por encima del objetivo — mantener Z2 estricto')
    severity = 'warning'
  }

  // CI-B-03 — Sobrecarga en gym: RPE >= 8 para atletas con plan de gym (cualquier fase)
  if (
    context.hasGymPlan &&
    checkIn.rpe !== undefined &&
    checkIn.rpe >= CHECK_IN_THRESHOLDS.HIGH_RPE
  ) {
    triggers.push('gym_sobrecarga')
    adjustments.push('RPE de gym elevado — considera reducir volumen o intensidad esta semana')
    if (severity === 'ok') severity = 'warning'
  }

  // Dolor/lesión — critical
  if (checkIn.painLevel && checkIn.painLevel >= CHECK_IN_THRESHOLDS.HIGH_PAIN) {
    triggers.push('dolor_activo')
    adjustments.push(
      'Dolor reportado — sesiones de impacto convertidas a recuperación activa. Evaluación médica recomendada.'
    )
    severity = 'critical'
  }

  // Energía baja
  if (checkIn.energyLevel !== undefined && checkIn.energyLevel <= CHECK_IN_THRESHOLDS.LOW_ENERGY) {
    triggers.push('energia_baja')
    adjustments.push('Energía baja — reducir carga esta semana y priorizar recuperación')
    if (severity === 'ok') severity = 'warning'
  }

  // Estrés alto
  if (checkIn.stressLevel !== undefined && checkIn.stressLevel >= CHECK_IN_THRESHOLDS.HIGH_STRESS) {
    triggers.push('estres_alto')
    adjustments.push(
      'Estrés elevado — reducir volumen 15% y priorizar sesiones de baja intensidad'
    )
    if (severity === 'ok') severity = 'warning'
  }

  // Motivación muy baja — alerta al coach, no modifica el plan
  if (checkIn.motivation !== undefined && checkIn.motivation <= 3) {
    triggers.push('motivacion_baja')
    adjustments.push('Motivación baja detectada — compártelo con tu coach en la próxima sesión')
    if (severity === 'ok') severity = 'warning'
  }

  // CI-B-04 — Déficit nutricional crítico: adherencia muy baja + energía muy baja
  if (
    checkIn.nutritionAdherence !== undefined &&
    checkIn.nutritionAdherence <= 2 &&
    checkIn.energyLevel !== undefined &&
    checkIn.energyLevel <= CHECK_IN_THRESHOLDS.LOW_ENERGY
  ) {
    triggers.push('nutricion_deficit_critico')
    adjustments.push(
      'Adherencia nutricional crítica junto con energía muy baja — revisa tu ingesta calórica con urgencia'
    )
    severity = 'critical'
  }

  // Adherencia nutricional baja (regla general — no aplica si ya se detectó déficit crítico)
  if (
    checkIn.nutritionAdherence !== undefined &&
    checkIn.nutritionAdherence < 4 &&
    !triggers.includes('nutricion_deficit_critico')
  ) {
    triggers.push('nutricion_baja')
    adjustments.push(
      'Adherencia nutricional baja — puede afectar recuperación y composición corporal'
    )
    if (severity === 'ok') severity = 'warning'
  }

  // Pérdida de peso rápida (>1 kg vs semana anterior)
  if (
    checkIn.weight &&
    context.previousWeight &&
    context.previousWeight - checkIn.weight > CHECK_IN_THRESHOLDS.WEIGHT_LOSS_WEEKLY
  ) {
    triggers.push('perdida_peso_rapida')
    adjustments.push(
      'Pérdida de peso elevada — revisar ingesta calórica, posible déficit excesivo'
    )
    if (severity === 'ok') severity = 'warning'
  }

  // ── Objective rules — from real training data (WeekActivitySummary) ──────

  const wa = context.weekActivity

  // OBJ-01: Días consecutivos sin descanso (≥5 días seguidos con actividad)
  if (wa && wa.consecutiveActiveDays >= 5) {
    triggers.push('sin_descanso')
    adjustments.push(
      `${wa.consecutiveActiveDays} días seguidos entrenando — programa un día de descanso para evitar sobrecarga`
    )
    if (severity === 'ok') severity = 'warning'
  }

  // OBJ-02: RPE objetivo discrepancia — sesiones reales muestran RPE alto (≥8) pero atleta reporta bajo (≤5)
  if (
    wa?.avgRpe != null && wa.avgRpe >= 8 &&
    checkIn.rpe !== undefined && checkIn.rpe <= 5
  ) {
    triggers.push('rpe_discrepancia')
    adjustments.push(
      `RPE promedio de sesiones esta semana: ${wa.avgRpe.toFixed(1)} — superior a lo que reportas. Revisa si estás subestimando la carga.`
    )
    if (severity === 'ok') severity = 'warning'
  }

  // OBJ-03: Pico de volumen — minutos esta semana > 150% del promedio de las últimas 4 semanas
  if (
    wa && wa.totalMinutes > 0 &&
    wa.prevWeeksAvgMinutes != null && wa.prevWeeksAvgMinutes > 0
  ) {
    const volumeRatio = wa.totalMinutes / wa.prevWeeksAvgMinutes
    if (volumeRatio >= 1.5) {
      triggers.push('pico_volumen')
      adjustments.push(
        `Volumen semanal ${Math.round(volumeRatio * 100 - 100)}% por encima de tu promedio — riesgo de lesión si se mantiene`
      )
      if (severity === 'ok') severity = 'warning'
    }
  }

  // OBJ-04: RPE máximo extremo — alguna sesión de la semana con RPE ≥ 9
  if (wa?.maxRpe != null && wa.maxRpe >= 9 && !triggers.includes('rpe_excesivo')) {
    triggers.push('sesion_muy_intensa')
    adjustments.push(
      `Registraste una sesión con RPE ${wa.maxRpe} esta semana — asegura descanso adecuado después de esfuerzos máximos`
    )
    if (severity === 'ok') severity = 'warning'
  }

  // Fatiga acumulada — regla compuesta: 3+ triggers individuales en el mismo check-in
  // No aplica ajustes de sesión por sí sola — es una alerta para el coach
  if (triggers.length >= 3) {
    triggers.push('fatiga_acumulada')
    adjustments.push(
      'Fatiga acumulada: múltiples señales de sobrecarga esta semana. Considera reducir la carga total y comunicárselo a tu coach.'
    )
    severity = 'critical'
  }

  return { triggers, adjustments, severity }
}

/** Maps triggers to session update actions — pure logic, no DB. */
export function buildSessionAdjustments(
  triggers: string[]
): {
  hasPain: boolean
  hasVolumeTrigger: boolean
  hasRpe: boolean
  volumeReduction: number
} {
  return {
    hasPain: triggers.includes('dolor_activo'),
    hasVolumeTrigger: ['energia_baja', 'sueno_bajo', 'fc_alta', 'estres_alto', 'pico_volumen', 'sin_descanso'].some(t =>
      triggers.includes(t)
    ),
    hasRpe: triggers.includes('rpe_excesivo'),
    volumeReduction: triggers.includes('estres_alto') ? 0.85 : 0.8,
  }
}
