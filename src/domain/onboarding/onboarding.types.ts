// Onboarding domain types — pure data shapes, no presentation or framework dependencies

export type ActivityType = 'GYM' | 'RUNNING' | 'BOTH' | 'FREE'
export type GymGoal = 'MUSCLE_GAIN' | 'FAT_LOSS' | 'RECOMPOSITION'
export type RunningGoal = 'GENERAL_FITNESS' | 'RACE_5K' | 'RACE_10K'
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type WizardData = {
  // ── Paso 1: ¿Qué haces? ──────────────────────────────────────────────────
  activityType: ActivityType | null
  gymGoal: GymGoal | null          // solo cuando activityType = 'GYM' o 'BOTH'
  runningGoal: RunningGoal | null  // solo cuando activityType = 'RUNNING' o 'BOTH'

  // ── Paso 2: Tu perfil (datos físicos + disponibilidad + salud) ───────────
  age: number | null
  heightCm: number | null
  weightKg: number | null
  gender: 'male' | 'female' | 'other' | null
  weightGoalKg: number | null      // opcional
  daysPerWeek: number
  sessionMinutes: number           // 30, 45, 60, 90
  experienceLevel: ExperienceLevel | null  // opcional
  injuries: string                 // texto libre, opcional
  conditions: string               // texto libre, opcional
}
