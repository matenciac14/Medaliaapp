export const SESSION_NAMES: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2',
  FARTLEK: 'Fartlek',
  TIRADA_LARGA: 'Tirada larga',
  INTERVALOS: 'Intervalos',
  TEMPO: 'Tempo',
  UMBRALES: 'Umbrales',
  CICLA: 'Ciclismo',
  NATACION: 'Natación',
  FUERZA: 'Fuerza',
  TEST: 'Test',
  SIMULACRO: 'Simulacro',
  TECNICA: 'Técnica',
  OTRO: 'Entreno',
  DESCANSO: 'Descanso',
}

export const SESSION_ICONS: Record<string, string> = {
  RODAJE_Z2: '🏃',
  FARTLEK: '⚡',
  TIRADA_LARGA: '🛣️',
  INTERVALOS: '🔁',
  TEMPO: '🎯',
  UMBRALES: '📈',
  CICLA: '🚴',
  NATACION: '🏊',
  FUERZA: '💪',
  TEST: '📋',
  SIMULACRO: '🏁',
  TECNICA: '🎯',
  OTRO: '🏅',
  DESCANSO: '😴',
}

export const DAY_LABELS: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
}

/** Mon-first 0-based array for index access: idx 0=Lun … 6=Dom. */
export const WEEK_DAYS_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'] as const

/** Mon-first full names for forms and selects: idx 0=Lunes … 6=Domingo. */
export const DAY_NAMES_FULL = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'] as const
