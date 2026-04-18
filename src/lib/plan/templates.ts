// ---------------------------------------------------------------------------
// templates.ts — Plantillas base de plan por GoalType
// Define estructura sin texto personalizado. El generator.ts aplica AI encima.
// ---------------------------------------------------------------------------

export type SessionTemplate = {
  dayOfWeek: number // 1=lun, 7=dom
  type: string      // debe coincidir con SessionType enum
  durationMin: number
  zoneTarget: string
  structure: string // descripción genérica
}

export type WeekTemplate = {
  weekNumber: number
  phase: 'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO'
  volumeKm: number
  isRecoveryWeek: boolean
  focusDescription: string
  sessions: SessionTemplate[]
}

export type PlanTemplate = {
  goalType: string
  totalWeeks: number
  weeks: WeekTemplate[]
}

// ---------------------------------------------------------------------------
// HALF_MARATHON_18W
// Fases: Base (1-4), Desarrollo (5-10), Específico (11-15), Afinamiento (16-18)
// Estructura: Lun=fuerza, Mar=Z2, Mié=calidad, Jue=cicla Z2, Vie=Z2+fuerza, Sáb=natación, Dom=tirada larga
// ---------------------------------------------------------------------------

const halfMarathonQualityByPhase: Record<string, SessionTemplate> = {
  BASE: {
    dayOfWeek: 3,
    type: 'FARTLEK',
    durationMin: 40,
    zoneTarget: 'Z2-Z3',
    structure: 'Fartlek libre: 5min calentamiento Z1, series 1min Z3/1min Z2 × 10, 5min vuelta calma Z1',
  },
  DESARROLLO: {
    dayOfWeek: 3,
    type: 'TEMPO',
    durationMin: 50,
    zoneTarget: 'Z3-Z4',
    structure: 'Rodaje tempo: 10min calentamiento Z2, 25min Z3 continuo, 10min vuelta calma Z2',
  },
  ESPECIFICO: {
    dayOfWeek: 3,
    type: 'INTERVALOS',
    durationMin: 55,
    zoneTarget: 'Z4',
    structure: 'Intervalos: 10min calentamiento, 6×1000m Z4 (rec 90s trot Z1), 10min vuelta calma',
  },
  AFINAMIENTO: {
    dayOfWeek: 3,
    type: 'TEMPO',
    durationMin: 40,
    zoneTarget: 'Z3',
    structure: 'Tempo suave: 10min calentamiento, 20min ritmo carrera objetivo, 10min vuelta calma',
  },
}

function buildHalfMarathonWeek(
  weekNumber: number,
  phase: 'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO',
  volumeKm: number,
  isRecoveryWeek: boolean,
  longRunMin: number,
  focusDescription: string
): WeekTemplate {
  const qualitySession = halfMarathonQualityByPhase[phase]
  return {
    weekNumber,
    phase,
    volumeKm,
    isRecoveryWeek,
    focusDescription,
    sessions: [
      {
        dayOfWeek: 1,
        type: 'FUERZA',
        durationMin: 45,
        zoneTarget: 'N/A',
        structure: 'Fuerza específica corredor: sentadillas, lunges, hip thrust, core anti-rotacional. 3×12',
      },
      {
        dayOfWeek: 2,
        type: 'RODAJE_Z2',
        durationMin: 45,
        zoneTarget: 'Z2',
        structure: 'Rodaje aeróbico base en Z2. Conversacional — si no puedes hablar, baja el ritmo.',
      },
      qualitySession,
      {
        dayOfWeek: 4,
        type: 'CICLA',
        durationMin: 50,
        zoneTarget: 'Z2',
        structure: 'Cicla de bajo impacto Z2. Recuperación activa manteniendo base aeróbica.',
      },
      {
        dayOfWeek: 5,
        type: 'RODAJE_Z2',
        durationMin: 40,
        zoneTarget: 'Z2',
        structure: 'Rodaje Z2 + 15min fuerza core y movilidad de cadera post-rodaje.',
      },
      {
        dayOfWeek: 6,
        type: 'NATACION',
        durationMin: 45,
        zoneTarget: 'Z1-Z2',
        structure: 'Natación técnica. Trabajo de brazada y patada. Recuperación activa.',
      },
      {
        dayOfWeek: 7,
        type: 'TIRADA_LARGA',
        durationMin: longRunMin,
        zoneTarget: 'Z2',
        structure: `Tirada larga en Z2. Último 10% a ritmo Z3 si te sientes bien. Nutrición: gel cada 40min.`,
      },
    ],
  }
}

export const HALF_MARATHON_18W: PlanTemplate = {
  goalType: 'RACE_HALF_MARATHON',
  totalWeeks: 18,
  weeks: [
    // === BASE (semanas 1-4) ===
    buildHalfMarathonWeek(1, 'BASE', 30, false, 70, 'Establecer base aeróbica y hábitos de entrenamiento'),
    buildHalfMarathonWeek(2, 'BASE', 34, false, 80, 'Incremento progresivo de volumen'),
    buildHalfMarathonWeek(3, 'BASE', 38, false, 90, 'Consolidar base aeróbica'),
    buildHalfMarathonWeek(4, 'BASE', 28, true,  60, 'Semana de recuperación — absorber adaptaciones'),

    // === DESARROLLO (semanas 5-10) ===
    buildHalfMarathonWeek(5,  'DESARROLLO', 40, false, 100, 'Introducir trabajo de umbral'),
    buildHalfMarathonWeek(6,  'DESARROLLO', 44, false, 110, 'Consolidar tempo runs'),
    buildHalfMarathonWeek(7,  'DESARROLLO', 48, false, 120, 'Incremento de volumen y calidad'),
    buildHalfMarathonWeek(8,  'DESARROLLO', 36, true,  75,  'Semana de recuperación activa'),
    buildHalfMarathonWeek(9,  'DESARROLLO', 50, false, 130, 'Pico de volumen desarrollo'),
    buildHalfMarathonWeek(10, 'DESARROLLO', 38, true,  80,  'Descarga antes de fase específica'),

    // === ESPECÍFICO (semanas 11-15) ===
    buildHalfMarathonWeek(11, 'ESPECIFICO', 52, false, 140, 'Trabajo específico de media maratón'),
    buildHalfMarathonWeek(12, 'ESPECIFICO', 55, false, 150, 'Pico de distancia en tirada larga'),
    buildHalfMarathonWeek(13, 'ESPECIFICO', 40, true,  90,  'Semana de recuperación'),
    buildHalfMarathonWeek(14, 'ESPECIFICO', 54, false, 145, 'Simulacro de ritmo carrera'),
    buildHalfMarathonWeek(15, 'ESPECIFICO', 45, false, 120, 'Inicio descarga'),

    // === AFINAMIENTO (semanas 16-18) ===
    buildHalfMarathonWeek(16, 'AFINAMIENTO', 35, false, 100, 'Reducir volumen, mantener intensidad'),
    buildHalfMarathonWeek(17, 'AFINAMIENTO', 24, false, 70,  'Semana de ajuste fino pre-carrera'),
    buildHalfMarathonWeek(18, 'AFINAMIENTO', 12, false, 30,  'Última semana — mantener piernas activas'),
  ],
}

// ---------------------------------------------------------------------------
// 10K_12W
// Fases: Base (1-4), Desarrollo (5-9), Afinamiento (10-12)
// ---------------------------------------------------------------------------

export const TEN_K_12W: PlanTemplate = {
  goalType: 'RACE_10K',
  totalWeeks: 12,
  weeks: [
    // === BASE (1-4) ===
    {
      weekNumber: 1, phase: 'BASE', volumeKm: 24, isRecoveryWeek: false,
      focusDescription: 'Establecer base aeróbica',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 40, zoneTarget: 'N/A', structure: 'Fuerza funcional corredor. Sentadillas, lunges, core.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje suave Z2 conversacional.' },
        { dayOfWeek: 3, type: 'FARTLEK', durationMin: 40, zoneTarget: 'Z2-Z3', structure: 'Fartlek: 5 series 1min Z3 / 2min Z2.' },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2 + activación muscular.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 55, zoneTarget: 'Z2', structure: 'Tirada larga Z2 sin forzar.' },
      ],
    },
    {
      weekNumber: 2, phase: 'BASE', volumeKm: 28, isRecoveryWeek: false,
      focusDescription: 'Incremento de volumen base',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 40, zoneTarget: 'N/A', structure: 'Fuerza: incrementar carga 5-10%.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2 estable.' },
        { dayOfWeek: 3, type: 'FARTLEK', durationMin: 45, zoneTarget: 'Z2-Z3', structure: 'Fartlek: 6 series 1min Z3 / 2min Z2.' },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2 recuperación.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 65, zoneTarget: 'Z2', structure: 'Tirada larga Z2.' },
      ],
    },
    {
      weekNumber: 3, phase: 'BASE', volumeKm: 32, isRecoveryWeek: false,
      focusDescription: 'Consolidar base aeróbica',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza completa + isométricos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 45, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'TEMPO', durationMin: 45, zoneTarget: 'Z3', structure: 'Primer tempo: 10min calentamiento, 20min Z3, 10min vuelta calma.' },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 70, zoneTarget: 'Z2', structure: 'Tirada larga Z2.' },
      ],
    },
    {
      weekNumber: 4, phase: 'BASE', volumeKm: 22, isRecoveryWeek: true,
      focusDescription: 'Semana de recuperación — absorber adaptaciones',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 30, zoneTarget: 'N/A', structure: 'Fuerza ligera. Movilidad y activación.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z1-Z2', structure: 'Rodaje muy suave Z1-Z2.' },
        { dayOfWeek: 4, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje Z2 corto.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 50, zoneTarget: 'Z2', structure: 'Tirada corta Z2.' },
      ],
    },

    // === DESARROLLO (5-9) ===
    {
      weekNumber: 5, phase: 'DESARROLLO', volumeKm: 34, isRecoveryWeek: false,
      focusDescription: 'Introducir intervalos al ritmo 10K',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza específica corredor.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'INTERVALOS', durationMin: 50, zoneTarget: 'Z4', structure: '4×1000m Z4 (rec 90s Z1), calentamiento y vuelta calma 10min.' },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 75, zoneTarget: 'Z2', structure: 'Tirada larga Z2.' },
      ],
    },
    {
      weekNumber: 6, phase: 'DESARROLLO', volumeKm: 38, isRecoveryWeek: false,
      focusDescription: 'Aumentar volumen de calidad',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza + pliométricos ligeros.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 45, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'INTERVALOS', durationMin: 55, zoneTarget: 'Z4', structure: '5×1000m Z4 (rec 90s), calentamiento 10min.' },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 80, zoneTarget: 'Z2', structure: 'Tirada larga Z2.' },
      ],
    },
    {
      weekNumber: 7, phase: 'DESARROLLO', volumeKm: 40, isRecoveryWeek: false,
      focusDescription: 'Pico de desarrollo',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza máxima corredor.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 45, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'INTERVALOS', durationMin: 60, zoneTarget: 'Z4', structure: '6×1000m Z4 (rec 90s), calentamiento 10min.' },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 45, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 85, zoneTarget: 'Z2', structure: 'Tirada larga Z2, últimos 15min a ritmo carrera.' },
      ],
    },
    {
      weekNumber: 8, phase: 'DESARROLLO', volumeKm: 28, isRecoveryWeek: true,
      focusDescription: 'Recuperación antes de fase específica',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 30, zoneTarget: 'N/A', structure: 'Fuerza ligera.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z1-Z2', structure: 'Rodaje suave.' },
        { dayOfWeek: 4, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 60, zoneTarget: 'Z2', structure: 'Tirada Z2 corta.' },
      ],
    },
    {
      weekNumber: 9, phase: 'DESARROLLO', volumeKm: 38, isRecoveryWeek: false,
      focusDescription: 'Simulacro de ritmo 10K',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza + pliométricos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'SIMULACRO', durationMin: 55, zoneTarget: 'Z4', structure: 'Simulacro 5K a ritmo objetivo 10K. Calentamiento 15min, 5K a fondo, vuelta calma.' },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2 recuperación post-simulacro.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 80, zoneTarget: 'Z2', structure: 'Tirada larga Z2.' },
      ],
    },

    // === AFINAMIENTO (10-12) ===
    {
      weekNumber: 10, phase: 'AFINAMIENTO', volumeKm: 30, isRecoveryWeek: false,
      focusDescription: 'Reducir volumen, mantener intensidad',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 35, zoneTarget: 'N/A', structure: 'Fuerza ligera — activación.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'INTERVALOS', durationMin: 45, zoneTarget: 'Z4', structure: '4×1000m Z4 (rec 2min). Mantener sensaciones.' },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje Z2 corto.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 65, zoneTarget: 'Z2', structure: 'Tirada Z2.' },
      ],
    },
    {
      weekNumber: 11, phase: 'AFINAMIENTO', volumeKm: 20, isRecoveryWeek: false,
      focusDescription: 'Ajuste fino pre-carrera',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 25, zoneTarget: 'N/A', structure: 'Activación muscular ligera.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje Z2 suave.' },
        { dayOfWeek: 3, type: 'TEMPO', durationMin: 35, zoneTarget: 'Z3', structure: '10min calentamiento, 15min ritmo carrera objetivo, 10min vuelta calma.' },
        { dayOfWeek: 6, type: 'RODAJE_Z2', durationMin: 25, zoneTarget: 'Z1-Z2', structure: 'Trote suave pre-carrera.' },
      ],
    },
    {
      weekNumber: 12, phase: 'AFINAMIENTO', volumeKm: 10, isRecoveryWeek: false,
      focusDescription: 'Semana de carrera — piernas listas',
      sessions: [
        { dayOfWeek: 1, type: 'RODAJE_Z2', durationMin: 20, zoneTarget: 'Z1', structure: 'Trote muy suave 20min + estiramientos.' },
        { dayOfWeek: 3, type: 'RODAJE_Z2', durationMin: 20, zoneTarget: 'Z2', structure: '15min suave + 4×100m strides.' },
        { dayOfWeek: 6, type: 'RODAJE_Z2', durationMin: 15, zoneTarget: 'Z1', structure: 'Trote 10-15min + activación día antes.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// 5K_8W
// Fases: Base (1-4), Específico (5-8)
// ---------------------------------------------------------------------------

export const FIVE_K_8W: PlanTemplate = {
  goalType: 'RACE_5K',
  totalWeeks: 8,
  weeks: [
    // === BASE (1-4) ===
    {
      weekNumber: 1, phase: 'BASE', volumeKm: 18, isRecoveryWeek: false,
      focusDescription: 'Activar base aeróbica',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 35, zoneTarget: 'N/A', structure: 'Fuerza funcional: sentadillas, zancadas, core.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje suave Z2.' },
        { dayOfWeek: 4, type: 'FARTLEK', durationMin: 35, zoneTarget: 'Z2-Z3', structure: 'Fartlek: 4 series 1min Z3 / 2min Z2.' },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 45, zoneTarget: 'Z2', structure: 'Tirada Z2.' },
      ],
    },
    {
      weekNumber: 2, phase: 'BASE', volumeKm: 22, isRecoveryWeek: false,
      focusDescription: 'Incremento progresivo',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 35, zoneTarget: 'N/A', structure: 'Fuerza + saltos cortos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'FARTLEK', durationMin: 40, zoneTarget: 'Z2-Z3', structure: 'Fartlek: 5 series 1min Z3 / 2min Z2.' },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 50, zoneTarget: 'Z2', structure: 'Tirada Z2.' },
      ],
    },
    {
      weekNumber: 3, phase: 'BASE', volumeKm: 25, isRecoveryWeek: false,
      focusDescription: 'Consolidar base con primer tempo',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 40, zoneTarget: 'N/A', structure: 'Fuerza + pliométricos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'TEMPO', durationMin: 40, zoneTarget: 'Z3', structure: '8min calentamiento, 18min Z3, 8min vuelta calma.' },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 55, zoneTarget: 'Z2', structure: 'Tirada Z2.' },
      ],
    },
    {
      weekNumber: 4, phase: 'BASE', volumeKm: 16, isRecoveryWeek: true,
      focusDescription: 'Recuperación',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 25, zoneTarget: 'N/A', structure: 'Fuerza ligera.' },
        { dayOfWeek: 3, type: 'RODAJE_Z2', durationMin: 25, zoneTarget: 'Z1-Z2', structure: 'Trote suave.' },
        { dayOfWeek: 6, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2 corto.' },
      ],
    },

    // === ESPECÍFICO (5-8) ===
    {
      weekNumber: 5, phase: 'ESPECIFICO', volumeKm: 26, isRecoveryWeek: false,
      focusDescription: 'Intervalos al ritmo 5K',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 40, zoneTarget: 'N/A', structure: 'Fuerza potencia.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'INTERVALOS', durationMin: 45, zoneTarget: 'Z4-Z5', structure: '6×400m Z4-Z5 (rec 90s Z1). Calentamiento 10min.' },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 55, zoneTarget: 'Z2', structure: 'Tirada Z2 con último kilómetro a ritmo objetivo 5K.' },
      ],
    },
    {
      weekNumber: 6, phase: 'ESPECIFICO', volumeKm: 28, isRecoveryWeek: false,
      focusDescription: 'Pico de calidad',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 40, zoneTarget: 'N/A', structure: 'Fuerza + pliométricos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'INTERVALOS', durationMin: 50, zoneTarget: 'Z4-Z5', structure: '8×400m Z4-Z5 (rec 90s) o 4×800m Z4 (rec 2min).' },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 60, zoneTarget: 'Z2', structure: 'Tirada Z2.' },
      ],
    },
    {
      weekNumber: 7, phase: 'ESPECIFICO', volumeKm: 20, isRecoveryWeek: false,
      focusDescription: 'Ajuste fino — piernas descansadas',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 30, zoneTarget: 'N/A', structure: 'Activación ligera.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'INTERVALOS', durationMin: 40, zoneTarget: 'Z4', structure: '5×400m a ritmo carrera (rec 2min). Mantener sensaciones.' },
        { dayOfWeek: 6, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje suave Z2.' },
      ],
    },
    {
      weekNumber: 8, phase: 'ESPECIFICO', volumeKm: 10, isRecoveryWeek: false,
      focusDescription: 'Semana de carrera',
      sessions: [
        { dayOfWeek: 1, type: 'RODAJE_Z2', durationMin: 20, zoneTarget: 'Z1-Z2', structure: 'Trote suave 20min.' },
        { dayOfWeek: 3, type: 'RODAJE_Z2', durationMin: 20, zoneTarget: 'Z2', structure: '15min suave + 4×100m strides rápidos.' },
        { dayOfWeek: 6, type: 'DESCANSO', durationMin: 10, zoneTarget: 'Z1', structure: 'Caminata 10min + estiramientos suaves.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// BODY_RECOMPOSITION_16W
// Fases: Base (1-4), Desarrollo (5-10), Específico (11-14), Afinamiento (15-16)
// Estructura: Lun=fuerza completa, Mar=cardio Z2 40min, Mié=fuerza, Jue=cardio HIIT 30min, Vie=fuerza, Sáb=cardio suave, Dom=descanso activo
// ---------------------------------------------------------------------------

function buildRecompWeek(
  weekNumber: number,
  phase: 'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO',
  volumeKm: number,
  isRecoveryWeek: boolean,
  focusDescription: string,
  strengthDurationMin: number = 55,
  hiitDurationMin: number = 30,
): WeekTemplate {
  return {
    weekNumber,
    phase,
    volumeKm,
    isRecoveryWeek,
    focusDescription,
    sessions: [
      {
        dayOfWeek: 1,
        type: 'FUERZA',
        durationMin: strengthDurationMin,
        zoneTarget: 'N/A',
        structure: 'Fuerza cuerpo completo: press, jalón, sentadilla, peso muerto, core. 4×8-10 reps.',
      },
      {
        dayOfWeek: 2,
        type: 'RODAJE_Z2',
        durationMin: 40,
        zoneTarget: 'Z2',
        structure: 'Cardio aeróbico Z2: caminata rápida o trote suave. Quema grasa sin cortisol excesivo.',
      },
      {
        dayOfWeek: 3,
        type: 'FUERZA',
        durationMin: strengthDurationMin,
        zoneTarget: 'N/A',
        structure: 'Fuerza enfocada en tren inferior + empuje vertical: sentadilla frontal, press banca inclinado, remo cable.',
      },
      {
        dayOfWeek: 4,
        type: 'OTRO', // HIIT
        durationMin: hiitDurationMin,
        zoneTarget: 'Z4-Z5',
        structure: 'HIIT metabólico: 5 rondas (20s trabajo / 10s descanso × 8 ejercicios). Burpees, mountain climbers, kettlebell swings.',
      },
      {
        dayOfWeek: 5,
        type: 'FUERZA',
        durationMin: strengthDurationMin,
        zoneTarget: 'N/A',
        structure: 'Fuerza tren superior + core: pull-up, press militar, remo barra, plancha RKC, pallof press.',
      },
      {
        dayOfWeek: 6,
        type: 'RODAJE_Z2',
        durationMin: 45,
        zoneTarget: 'Z1-Z2',
        structure: 'Cardio suave recuperación: caminata 45min o bici estática Z1-Z2. Sin impacto.',
      },
      {
        dayOfWeek: 7,
        type: 'DESCANSO',
        durationMin: 30,
        zoneTarget: 'Z1',
        structure: 'Descanso activo: yoga, movilidad, foam rolling. Máximo 30min de actividad ligera.',
      },
    ],
  }
}

export const BODY_RECOMPOSITION_16W: PlanTemplate = {
  goalType: 'BODY_RECOMPOSITION',
  totalWeeks: 16,
  weeks: [
    // === BASE (1-4) — Adaptar al movimiento, crear hábito ===
    buildRecompWeek(1,  'BASE', 10, false, 'Adaptación al movimiento y técnica básica', 45, 25),
    buildRecompWeek(2,  'BASE', 12, false, 'Consolidar patrón motor', 50, 25),
    buildRecompWeek(3,  'BASE', 12, false, 'Incrementar intensidad de fuerza', 55, 30),
    buildRecompWeek(4,  'BASE', 8,  true,  'Semana de recuperación activa', 35, 20),

    // === DESARROLLO (5-10) — Construcción muscular + déficit moderado ===
    buildRecompWeek(5,  'DESARROLLO', 14, false, 'Introducir sobrecarga progresiva', 55, 30),
    buildRecompWeek(6,  'DESARROLLO', 15, false, 'Pesos más altos, menos reps', 60, 30),
    buildRecompWeek(7,  'DESARROLLO', 15, false, 'Pico de volumen de entrenamiento', 60, 35),
    buildRecompWeek(8,  'DESARROLLO', 10, true,  'Descarga — absorber adaptaciones', 40, 20),
    buildRecompWeek(9,  'DESARROLLO', 16, false, 'Retomar con más carga', 60, 35),
    buildRecompWeek(10, 'DESARROLLO', 10, true,  'Semana de transición a fase específica', 40, 25),

    // === ESPECÍFICO (11-14) — Definición + mantenimiento masa muscular ===
    buildRecompWeek(11, 'ESPECIFICO', 18, false, 'Aumentar cardio, mantener fuerza', 55, 35),
    buildRecompWeek(12, 'ESPECIFICO', 18, false, 'Pico cardio-metabólico', 55, 35),
    buildRecompWeek(13, 'ESPECIFICO', 14, false, 'Mantener músculo con menos volumen', 50, 30),
    buildRecompWeek(14, 'ESPECIFICO', 16, false, 'Última semana de intensidad alta', 55, 35),

    // === AFINAMIENTO (15-16) — Evaluar y proyectar siguiente ciclo ===
    buildRecompWeek(15, 'AFINAMIENTO', 12, false, 'Reducir volumen, mantener movimiento', 45, 25),
    buildRecompWeek(16, 'AFINAMIENTO', 8,  false, 'Test de rendimiento y evaluación', 40, 20),
  ],
}

// ---------------------------------------------------------------------------
// Índice de plantillas
// ---------------------------------------------------------------------------

export const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
  RACE_HALF_MARATHON: HALF_MARATHON_18W,
  RACE_10K: TEN_K_12W,
  RACE_5K: FIVE_K_8W,
  BODY_RECOMPOSITION: BODY_RECOMPOSITION_16W,
}

export function getTemplate(goalType: string): PlanTemplate | null {
  return PLAN_TEMPLATES[goalType] ?? null
}
