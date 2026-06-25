/**
 * UserConfig — objeto JSON almacenado en User.config
 * Fuente de verdad de la experiencia del usuario en la app.
 *
 * El sistema lee este objeto para decidir qué mostrar y cómo comportarse.
 * El coach puede modificarlo por atleta. El onboarding lo construye progresivamente.
 */
export type UserPlan = 'FREE' | 'PRO'

export type UserConfig = {
  features: {
    plan: boolean        // Tiene acceso al módulo de plan
    checkin: boolean     // Puede hacer check-in semanal
    nutrition: boolean   // Tiene plan nutricional
    progress: boolean    // Puede ver historial de progreso
    log: boolean         // Puede registrar sesiones
    coach: boolean       // Tiene acceso al panel de coach (role COACH)
    gym: boolean         // Tiene acceso al gym tracker
  }
  sport: {
    type: 'RUNNING' | 'STRENGTH' | 'GENERAL' | null
    goal: 'RACE' | 'BODY_RECOMPOSITION' | 'GENERAL_FITNESS' | null
  }
  plan: {
    activePlanId: string | null
    currentWeek: number
    totalWeeks: number
    phase: 'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO' | null
  }
  onboarding: {
    completed: boolean
    completedAt: string | null   // ISO date
  }
  preferences: {
    language: 'es' | 'en'
    units: 'metric' | 'imperial'
    notifications: boolean
  }
}

/** Config por defecto para un usuario recién registrado */
export const DEFAULT_USER_CONFIG: UserConfig = {
  features: {
    plan: true,
    checkin: true,
    nutrition: true,
    progress: true,
    log: true,
    coach: false,
    gym: true,
  },
  sport: {
    type: null,
    goal: null,
  },
  plan: {
    activePlanId: null,
    currentWeek: 0,
    totalWeeks: 0,
    phase: null,
  },
  onboarding: {
    completed: false,
    completedAt: null,
  },
  preferences: {
    language: 'es',
    units: 'metric',
    notifications: true,
  },
}

/** Config de ejemplo para un atleta con plan */
export const FULL_ATHLETE_CONFIG: UserConfig = {
  features: {
    plan: true,
    checkin: true,
    nutrition: true,
    progress: true,
    log: true,
    coach: false,
    gym: true,
  },
  sport: {
    type: 'RUNNING',
    goal: 'RACE',
  },
  plan: {
    activePlanId: 'seed-plan-1',
    currentWeek: 1,
    totalWeeks: 18,
    phase: 'BASE',
  },
  onboarding: {
    completed: true,
    completedAt: '2026-04-18T00:00:00.000Z',
  },
  preferences: {
    language: 'es',
    units: 'metric',
    notifications: true,
  },
}

/** Config para un coach */
export const COACH_CONFIG: UserConfig = {
  features: {
    plan: false,
    checkin: false,
    nutrition: false,
    progress: false,
    log: false,
    coach: true,
    gym: false,
  },
  sport: { type: null, goal: null },
  plan: { activePlanId: null, currentWeek: 0, totalWeeks: 0, phase: null },
  onboarding: { completed: true, completedAt: '2026-04-18T00:00:00.000Z' },
  preferences: { language: 'es', units: 'metric', notifications: true },
}

/** Todos los usuarios tienen el mismo plan base */
export function getUserPlan(_features: UserConfig['features']): UserPlan {
  return 'FREE'
}

/** Helper: parsea el JSON crudo de la DB y hace merge con defaults */
export function parseUserConfig(raw: unknown): UserConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_CONFIG
  const partial = raw as Partial<UserConfig>
  // Explicitly pick only known feature keys to prevent stale fields (e.g. aiPlan, aiCoach)
  // from old DB records from leaking into the auth token.
  const pf = (partial.features ?? {}) as Record<string, boolean | undefined>
  return {
    ...DEFAULT_USER_CONFIG,
    ...partial,
    features: {
      plan:      pf.plan      ?? DEFAULT_USER_CONFIG.features.plan,
      checkin:   pf.checkin   ?? DEFAULT_USER_CONFIG.features.checkin,
      nutrition: pf.nutrition ?? DEFAULT_USER_CONFIG.features.nutrition,
      progress:  pf.progress  ?? DEFAULT_USER_CONFIG.features.progress,
      log:       pf.log       ?? DEFAULT_USER_CONFIG.features.log,
      coach:     pf.coach     ?? DEFAULT_USER_CONFIG.features.coach,
      gym:       pf.gym       ?? DEFAULT_USER_CONFIG.features.gym,
    },
    sport: { ...DEFAULT_USER_CONFIG.sport, ...(partial.sport ?? {}) },
    plan: { ...DEFAULT_USER_CONFIG.plan, ...(partial.plan ?? {}) },
    onboarding: { ...DEFAULT_USER_CONFIG.onboarding, ...(partial.onboarding ?? {}) },
    preferences: { ...DEFAULT_USER_CONFIG.preferences, ...(partial.preferences ?? {}) },
  }
}
