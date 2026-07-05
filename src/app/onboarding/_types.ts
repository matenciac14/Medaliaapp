// ---------------------------------------------------------------------------
// Onboarding simplificado — self-directed tracking
// El usuario define QUÉ hace (gym / running / ambos) y sus datos físicos.
// No se genera un plan de entrenamiento — solo NutritionPlan + WeeklyRoutine vacía.
//
// Para planes estructurados (B2B coach o /new-goal) se usa un wizard separado.
// ---------------------------------------------------------------------------

export type ActivityType = 'GYM' | 'RUNNING' | 'BOTH' | 'FREE'
export type GymGoal = 'MUSCLE_GAIN' | 'FAT_LOSS' | 'RECOMPOSITION'
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type StepId = 'goal' | 'physical' | 'generating'

export type WizardData = {
  // ── Paso 1: ¿Qué haces? ──────────────────────────────────────────────────
  activityType: ActivityType | null
  gymGoal: GymGoal | null       // solo cuando activityType = 'GYM' o 'BOTH'

  // ── Paso 2: Datos físicos ─────────────────────────────────────────────────
  age: number | null
  heightCm: number | null
  weightKg: number | null
  gender: 'male' | 'female' | null
  daysPerWeek: number
  weightGoalKg: number | null   // opcional
  experienceLevel: ExperienceLevel | null  // opcional
}

export const INITIAL_DATA: WizardData = {
  activityType: null,
  gymGoal: null,
  age: null,
  heightCm: null,
  weightKg: null,
  gender: null,
  daysPerWeek: 4,
  weightGoalKg: null,
  experienceLevel: null,
}

export function getSteps(data: WizardData): StepId[] {
  const steps: StepId[] = ['goal']

  if (!data.activityType) return steps
  if ((data.activityType === 'GYM' || data.activityType === 'BOTH') && !data.gymGoal) return steps

  steps.push('physical')

  if (!data.age || !data.heightCm || !data.weightKg || !data.gender) return steps

  steps.push('generating')
  return steps
}

export function isStepValid(stepId: StepId, data: WizardData): boolean {
  switch (stepId) {
    case 'goal':
      if (!data.activityType) return false
      if ((data.activityType === 'GYM' || data.activityType === 'BOTH') && !data.gymGoal) return false
      return true
    case 'physical':
      if (!data.age || !data.heightCm || !data.weightKg || !data.gender) return false
      if (data.age < 10 || data.age > 100) return false
      if (data.heightCm < 100 || data.heightCm > 250) return false
      if (data.weightKg < 30 || data.weightKg > 300) return false
      return true
    case 'generating':
      return true
  }
}
