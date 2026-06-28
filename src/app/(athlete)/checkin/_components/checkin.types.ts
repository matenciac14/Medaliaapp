export interface PrevMetrics {
  weightKg: number | null
  hrResting: number | null
  sleepHours: number | null
  energyLevel: number | null
  hardestSessionRpe: number | null
  prevSleepScore: number | null
  stressLevel: number | null
  motivationLevel: number | null
  painLevel: number | null
  prevNutritionAdherence: number | null
}

export interface LastWeekSummary {
  weightKg: number | null
  sleepHours: number | null
  energyLevel: number | null
  stressLevel: number | null
  motivationLevel: number | null
  adjustmentsTriggered: string[]
  recordedAt: Date
}

export type CheckInState = 'submitted' | 'early' | 'open'

export const TRIGGER_LABELS: Record<string, string> = {
  fc_alta:         '❤️ FC reposo elevada',
  sueno_bajo:      '😴 Sueño insuficiente',
  rpe_excesivo:    '⚡ RPE muy alto para la fase',
  energia_baja:    '🔋 Energía baja',
  dolor_activo:    '🚨 Dolor / molestia reportada',
  estres_alto:     '😰 Estrés elevado',
  motivacion_baja: '💭 Motivación baja',
  adherencia_baja: '📉 Adherencia baja al plan',
  nutricion_baja:  '🥗 Adherencia nutricional baja',
}
