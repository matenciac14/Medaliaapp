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
    plan: boolean        // Tiene acceso al módulo de plan (siempre true para B2C)
    checkin: boolean     // Puede hacer check-in semanal
    nutrition: boolean   // Tiene plan nutricional
    progress: boolean    // Puede ver historial de progreso
    log: boolean         // Puede registrar sesiones
    coach: boolean       // Tiene acceso al panel de coach (role COACH)
    gym: boolean         // Tiene acceso al gym tracker
    aiPlan: boolean      // PRO — genera plan con AI
    aiCoach: boolean     // PRO — chat con AI Coach
  }
  sport: {
    type: 'RUNNING' | 'CYCLING' | 'TRIATHLON' | 'SWIMMING' | 'FOOTBALL' | 'STRENGTH' | 'GENERAL' | null
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
  ai: {
    messagesThisMonth: number
    messagesResetAt: string   // "YYYY-MM" — primer día del mes actual
    monthlyLimit: number      // 100 para Pro, 0 para Free
  }
}

/** Config por defecto para un usuario recién registrado */
export const DEFAULT_USER_CONFIG: UserConfig = {
  features: {
    plan: true,       // todos los usuarios ven y gestionan su plan
    checkin: true,
    nutrition: true,
    progress: true,
    log: true,
    coach: false,
    gym: true,
    aiPlan: false,    // PRO — genera plan con AI
    aiCoach: false,   // PRO — chat con AI Coach
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
  ai: {
    messagesThisMonth: 0,
    messagesResetAt: '',
    monthlyLimit: 0,
  },
}

/** Config de ejemplo para un atleta PRO con plan */
export const FULL_ATHLETE_CONFIG: UserConfig = {
  features: {
    plan: true,
    checkin: true,
    nutrition: true,
    progress: true,
    log: true,
    coach: false,
    gym: true,
    aiPlan: true,
    aiCoach: true,
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
  ai: {
    messagesThisMonth: 0,
    messagesResetAt: '',
    monthlyLimit: 100,
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
    aiPlan: false,
    aiCoach: false,
  },
  sport: { type: null, goal: null },
  plan: { activePlanId: null, currentWeek: 0, totalWeeks: 0, phase: null },
  onboarding: { completed: true, completedAt: '2026-04-18T00:00:00.000Z' },
  preferences: { language: 'es', units: 'metric', notifications: true },
  ai: { messagesThisMonth: 0, messagesResetAt: '', monthlyLimit: 0 },
}

/** Deriva el plan del usuario a partir de sus features */
export function getUserPlan(features: UserConfig['features']): UserPlan {
  return (features.aiPlan || features.aiCoach) ? 'PRO' : 'FREE'
}

/** Helper: parsea el JSON crudo de la DB y hace merge con defaults */
export function parseUserConfig(raw: unknown): UserConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_CONFIG
  const partial = raw as Partial<UserConfig>
  return {
    ...DEFAULT_USER_CONFIG,
    ...partial,
    features: { ...DEFAULT_USER_CONFIG.features, ...(partial.features ?? {}) },
    sport: { ...DEFAULT_USER_CONFIG.sport, ...(partial.sport ?? {}) },
    plan: { ...DEFAULT_USER_CONFIG.plan, ...(partial.plan ?? {}) },
    onboarding: { ...DEFAULT_USER_CONFIG.onboarding, ...(partial.onboarding ?? {}) },
    preferences: { ...DEFAULT_USER_CONFIG.preferences, ...(partial.preferences ?? {}) },
    ai: { ...DEFAULT_USER_CONFIG.ai, ...(partial.ai ?? {}) },
  }
}
