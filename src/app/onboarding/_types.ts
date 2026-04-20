// ---------------------------------------------------------------------------
// WizardData — datos recolectados durante el onboarding
// Diseñado para soportar múltiples deportes y futuras integraciones
// ---------------------------------------------------------------------------

export type MainGoal = 'SPORT' | 'BODY'
export type Sport = 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'TRIATHLON' | 'FOOTBALL' | 'STRENGTH'
export type BodyGoal = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMPOSITION'
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type HRSource = 'known' | 'estimated'

// ---------------------------------------------------------------------------
// Day Schedule — distribución semanal de entrenamientos
// ---------------------------------------------------------------------------

export type CardioMachine = 'TREADMILL' | 'ELLIPTICAL' | 'BIKE' | 'ROWING' | 'ANY'
export type DayType = 'cardio' | 'strength' | 'rest'
export type MuscleGroupSplit = 'PUSH' | 'PULL' | 'LEGS' | 'FULL_BODY'

export type DayConfig = {
  type: DayType
  cardioMachine?: CardioMachine    // solo cuando type = 'cardio'
  split?: MuscleGroupSplit          // solo cuando type = 'strength'
}

// Claves 1–7 = Lun–Dom
export type WeekSchedule = { [key in 1 | 2 | 3 | 4 | 5 | 6 | 7]: DayConfig }

/** Pre-rellena una semana por defecto según los días disponibles */
export function getDefaultSchedule(daysPerWeek: number): WeekSchedule {
  const schedules: Record<number, WeekSchedule> = {
    3: {
      1: { type: 'strength' }, 2: { type: 'rest' },
      3: { type: 'cardio', cardioMachine: 'ANY' }, 4: { type: 'rest' },
      5: { type: 'strength' }, 6: { type: 'rest' }, 7: { type: 'rest' },
    },
    4: {
      1: { type: 'strength' }, 2: { type: 'cardio', cardioMachine: 'ANY' },
      3: { type: 'rest' }, 4: { type: 'strength' },
      5: { type: 'rest' }, 6: { type: 'cardio', cardioMachine: 'ANY' }, 7: { type: 'rest' },
    },
    5: {
      1: { type: 'strength' }, 2: { type: 'cardio', cardioMachine: 'ANY' },
      3: { type: 'strength' }, 4: { type: 'rest' },
      5: { type: 'strength' }, 6: { type: 'cardio', cardioMachine: 'ANY' }, 7: { type: 'rest' },
    },
    6: {
      1: { type: 'strength' }, 2: { type: 'cardio', cardioMachine: 'ANY' },
      3: { type: 'strength' }, 4: { type: 'cardio', cardioMachine: 'ANY' },
      5: { type: 'strength' }, 6: { type: 'cardio', cardioMachine: 'ANY' }, 7: { type: 'rest' },
    },
  }
  return schedules[daysPerWeek] ?? schedules[4]
}

export type WizardData = {
  // ── Paso 1: Meta principal
  mainGoal: MainGoal | null

  // ── Paso 2a: Deporte (si mainGoal = SPORT)
  sport: Sport | null

  // ── Paso 2b: Objetivo corporal (si mainGoal = BODY)
  bodyGoal: BodyGoal | null

  // ── Detalles de deporte
  // Running
  raceDistance: 'RACE_5K' | 'RACE_10K' | 'RACE_HALF_MARATHON' | 'RACE_MARATHON' | null
  raceDate: string | null
  targetTime: string | null
  recentBestTime: string | null

  // Ciclismo
  cyclingModality: 'ROAD' | 'MTB' | null
  hasPowerMeter: boolean | null
  ftp: number | null

  // Natación
  swimStroke: 'FREESTYLE' | 'BACKSTROKE' | 'BREASTSTROKE' | 'BUTTERFLY' | 'MIXED' | null
  recentSwimTime: string | null

  // Triatlón
  triathlonDistance: 'SPRINT' | 'OLYMPIC' | 'HALF' | 'FULL' | null
  weakestSegment: 'SWIM' | 'BIKE' | 'RUN' | null

  // Fútbol
  footballPosition: 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' | null
  competitionLevel: 'RECREATIONAL' | 'AMATEUR' | 'SEMIPRO' | null
  seasonPhase: 'PRESEASON' | 'INSEASON' | 'OFFSEASON' | null

  // Fuerza
  strengthStyle: 'POWERLIFTING' | 'HYPERTROPHY' | 'FUNCTIONAL' | null

  // ── Perfil físico (común a todos)
  age: number | null
  heightCm: number | null
  weightKg: number | null
  gender: 'male' | 'female' | null
  weightGoalKg: number | null

  // ── FC y rendimiento
  hrResting: number | null
  hrMax: number | null
  hrSource: HRSource | null
  experienceLevel: ExperienceLevel | null

  // ── Disponibilidad (común)
  daysPerWeek: number
  hoursPerSession: number

  // ── Distribución semanal (nuevo)
  weekSchedule: WeekSchedule | null

  // ── Salud (común)
  injuries: string[]
  conditions: string[]

  // ── Equipamiento
  equipment: string[]

  // ── Nutrición
  nutritionCommitment: 'strict' | 'moderate' | 'flexible' | null
}

export const INITIAL_DATA: WizardData = {
  mainGoal: null,
  sport: null,
  bodyGoal: null,
  raceDistance: null,
  raceDate: null,
  targetTime: null,
  recentBestTime: null,
  cyclingModality: null,
  hasPowerMeter: null,
  ftp: null,
  swimStroke: null,
  recentSwimTime: null,
  triathlonDistance: null,
  weakestSegment: null,
  footballPosition: null,
  competitionLevel: null,
  seasonPhase: null,
  strengthStyle: null,
  age: null,
  heightCm: null,
  weightKg: null,
  gender: null,
  weightGoalKg: null,
  hrResting: null,
  hrMax: null,
  hrSource: null,
  experienceLevel: null,
  daysPerWeek: 4,
  hoursPerSession: 1,
  weekSchedule: null,
  injuries: [],
  conditions: [],
  equipment: [],
  nutritionCommitment: null,
}

// ---------------------------------------------------------------------------
// Routing de pasos según mainGoal y sport
// ---------------------------------------------------------------------------

export type StepId =
  | 'main-goal'
  | 'sport-select'
  | 'body-goal'
  | 'sport-details'
  | 'physical'
  | 'hr-fitness'
  | 'schedule'
  | 'day-schedule'
  | 'health'
  | 'generating'

export function getSteps(data: WizardData): StepId[] {
  if (!data.mainGoal) return ['main-goal']

  const common: StepId[] = ['physical', 'hr-fitness', 'schedule', 'day-schedule', 'health', 'generating']

  if (data.mainGoal === 'SPORT') {
    if (!data.sport) return ['main-goal', 'sport-select']
    return ['main-goal', 'sport-select', 'sport-details', ...common]
  }

  // BODY
  return ['main-goal', 'body-goal', 'sport-details', ...common]
}
