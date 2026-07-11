// ---------------------------------------------------------------------------
// Onboarding — self-directed tracking
// El usuario define QUÉ hace (gym / running / ambos) y sus datos físicos.
// No se genera un plan de entrenamiento — solo NutritionPlan + WeeklyRoutine vacía.
//
// Para planes estructurados (B2B coach) el plan lo asigna el entrenador.
// ---------------------------------------------------------------------------

export type ActivityType = 'GYM' | 'RUNNING' | 'BOTH' | 'FREE'
export type GymGoal = 'MUSCLE_GAIN' | 'FAT_LOSS' | 'RECOMPOSITION'
export type RunningGoal = 'GENERAL_FITNESS' | 'RACE_5K' | 'RACE_10K'
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type StepId = 'goal' | 'profile' | 'generating'

export type WizardData = {
  // ── Paso 1: ¿Qué haces? ──────────────────────────────────────────────────
  activityType: ActivityType | null
  gymGoal: GymGoal | null          // solo cuando activityType = 'GYM' o 'BOTH'
  runningGoal: RunningGoal | null  // solo cuando activityType = 'RUNNING' o 'BOTH'

  // ── Paso 2: Tu perfil (datos físicos + disponibilidad + salud) ───────────
  age: number | null
  heightCm: number | null
  weightKg: number | null
  gender: 'male' | 'female' | null
  weightGoalKg: number | null      // opcional
  daysPerWeek: number
  sessionMinutes: number           // 30, 45, 60, 90
  experienceLevel: ExperienceLevel | null  // opcional
  injuries: string                 // texto libre, opcional
  conditions: string               // texto libre, opcional
}

export const INITIAL_DATA: WizardData = {
  activityType: null,
  gymGoal: null,
  runningGoal: null,
  age: null,
  heightCm: null,
  weightKg: null,
  gender: null,
  daysPerWeek: 4,
  sessionMinutes: 60,
  weightGoalKg: null,
  experienceLevel: null,
  injuries: '',
  conditions: '',
}

export function getSteps(data: WizardData): StepId[] {
  const steps: StepId[] = ['goal']

  if (!data.activityType) return steps

  // Gym/Both requiere gymGoal, Running/Both requiere runningGoal
  if ((data.activityType === 'GYM' || data.activityType === 'BOTH') && !data.gymGoal) return steps
  if ((data.activityType === 'RUNNING' || data.activityType === 'BOTH') && !data.runningGoal) return steps

  steps.push('profile')

  if (!data.age || !data.heightCm || !data.weightKg || !data.gender) return steps

  steps.push('generating')
  return steps
}

export function isStepValid(stepId: StepId, data: WizardData): boolean {
  switch (stepId) {
    case 'goal':
      if (!data.activityType) return false
      if ((data.activityType === 'GYM' || data.activityType === 'BOTH') && !data.gymGoal) return false
      if ((data.activityType === 'RUNNING' || data.activityType === 'BOTH') && !data.runningGoal) return false
      return true
    case 'profile':
      if (!data.age || !data.heightCm || !data.weightKg || !data.gender) return false
      if (data.age < 10 || data.age > 100) return false
      if (data.heightCm < 100 || data.heightCm > 250) return false
      if (data.weightKg < 30 || data.weightKg > 300) return false
      return true
    case 'generating':
      return true
  }
}
