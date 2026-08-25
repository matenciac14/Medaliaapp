/**
 * Pure domain function — generates check-in suggestions without writing to DB.
 * Called from process-check-in.use-case when plan.source === 'COACH'.
 *
 * Rules:
 *  - fatiga_acumulada trigger  → RECOVERY_WEEK suggestion
 *  - perdida_peso_rapida       → PLAN_ADJUSTMENT (caloric intake review)
 *  - energia_baja ×2 weeks     → GYM_DELOAD
 *  - any remaining triggers    → PLAN_ADJUSTMENT (session adjustments)
 */
import type { CheckInContext } from './evaluate-rules'

export type SuggestionType = 'PLAN_ADJUSTMENT' | 'RECOVERY_WEEK' | 'NUTRITION_CHANGE' | 'GYM_DELOAD'

export type SuggestionDraft = {
  type: SuggestionType
  title: string
  description: string
  payload: Record<string, unknown>
  expiresAt: Date
}

// consecutiveLowEnergyWeeks already in CheckInContext since CI-B-05
export type SuggestionGenerationContext = CheckInContext & {
  planId: string
  nextWeek: number
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function generateSuggestions(
  triggers: string[],
  adjustments: string[],
  context: SuggestionGenerationContext
): SuggestionDraft[] {
  if (triggers.length === 0) return []

  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS)
  const suggestions: SuggestionDraft[] = []
  const { planId, nextWeek } = context
  const remainingTriggers = new Set(triggers)

  // RECOVERY_WEEK — fatiga acumulada (3+ triggers)
  if (remainingTriggers.has('fatiga_acumulada')) {
    suggestions.push({
      type: 'RECOVERY_WEEK',
      title: 'Semana de recuperación sugerida',
      description:
        'Se detectaron múltiples señales de sobrecarga esta semana. Se recomienda reducir la carga total y convertir sesiones de calidad en rodaje suave.',
      payload: { planId, nextWeek, triggers: [...remainingTriggers] },
      expiresAt,
    })
    remainingTriggers.delete('fatiga_acumulada')
  }

  // NUTRITION_CHANGE — pérdida de peso acelerada
  if (remainingTriggers.has('perdida_peso_rapida')) {
    suggestions.push({
      type: 'NUTRITION_CHANGE',
      title: 'Revisión de ingesta calórica',
      description:
        'Pérdida de peso superior a 1 kg esta semana. Revisa tu ingesta calórica — un déficit excesivo puede comprometer la recuperación y el rendimiento.',
      payload: { trigger: 'perdida_peso_rapida', previousWeight: context.previousWeight },
      expiresAt,
    })
    remainingTriggers.delete('perdida_peso_rapida')
  }

  // GYM_DELOAD — sobrecarga en gym OR energía baja por 2+ semanas consecutivas
  const hasGymSobrecarga = remainingTriggers.has('gym_sobrecarga')
  const hasLowEnergyStreak = remainingTriggers.has('energia_baja') && (context.consecutiveLowEnergyWeeks ?? 0) >= 2
  if (hasGymSobrecarga || hasLowEnergyStreak) {
    const reason = hasGymSobrecarga
      ? 'RPE de gym elevado esta semana'
      : `Energía baja por ${context.consecutiveLowEnergyWeeks} semanas consecutivas`
    suggestions.push({
      type: 'GYM_DELOAD',
      title: 'Deload en gym sugerido',
      description:
        `${reason}. Se recomienda reducir volumen e intensidad en gym esta semana.`,
      payload: { planId, nextWeek, consecutiveLowEnergyWeeks: context.consecutiveLowEnergyWeeks },
      expiresAt,
    })
    remainingTriggers.delete('gym_sobrecarga')
    remainingTriggers.delete('energia_baja')
  }

  // PLAN_ADJUSTMENT — triggers de sesión restantes (dolor, RPE, estrés, sueño, energía, FC)
  const sessionTriggers = [...remainingTriggers].filter(t =>
    ['dolor_activo', 'rpe_excesivo', 'estres_alto', 'sueno_bajo', 'energia_baja', 'fc_alta'].includes(t)
  )

  if (sessionTriggers.length > 0) {
    const description = adjustments
      .filter(Boolean)
      .join(' ')
      .slice(0, 400) // safety cap

    suggestions.push({
      type: 'PLAN_ADJUSTMENT',
      title: 'Ajuste de plan sugerido',
      description: description || 'Tu coach ha recibido las señales de esta semana. Se sugieren ajustes en las sesiones de la próxima semana.',
      payload: { planId, nextWeek, triggers: sessionTriggers },
      expiresAt,
    })
  }

  return suggestions
}
