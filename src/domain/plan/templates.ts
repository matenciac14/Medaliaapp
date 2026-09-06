// ---------------------------------------------------------------------------
// templates.ts — Plantillas base de plan por GoalType
// Define estructura sin texto personalizado. El generator.ts aplica personalización encima.
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
// Helpers de estructura — formato: "zona|durMin|descripcion" por línea, "\n" separador
// Ejemplo: "Z1|10|Calentamiento\nZ4|18|6×1min Z4\nZ2|12|Vuelta a la calma"
// ---------------------------------------------------------------------------

function structFartlek(durationMin: number, sets: number): string {
  const warm = 10, cool = 10, main = Math.max(10, durationMin - warm - cool)
  return `Z1|${warm}|Calentamiento progresivo\nZ3|${main}|${sets} series 1min Z3 / 2min Z2 recuperación\nZ1|${cool}|Vuelta a la calma aeróbica`
}

function structTempo(durationMin: number, tempoMin: number): string {
  const warm = 10, cool = Math.max(5, durationMin - 10 - tempoMin)
  return `Z2|${warm}|Calentamiento aeróbico\nZ3|${tempoMin}|Tempo continuo — mantener ritmo umbral\nZ2|${cool}|Vuelta a la calma`
}

function structIntervalos(durationMin: number, reps: number, dist: string, zone = 'Z4'): string {
  const warm = 10, cool = 10, main = Math.max(10, durationMin - warm - cool)
  return `Z1|${warm}|Calentamiento\n${zone}|${main}|${reps}×${dist} (rec 90s Z1)\nZ1|${cool}|Vuelta a la calma`
}

function structSimulacro(durationMin: number, raceDist: string): string {
  const simMin = 25, warm = 15, cool = Math.max(5, durationMin - warm - simMin)
  return `Z2|${warm}|Calentamiento progresivo\nZ4|${simMin}|Simulacro ${raceDist} a ritmo objetivo\nZ2|${cool}|Vuelta a la calma`
}

function structTiradaLarga(durationMin: number, hasProgression = false): string {
  if (!hasProgression || durationMin < 40) {
    return `Z2|${durationMin}|Tirada aeróbica Z2 — conversacional todo el tiempo`
  }
  const base = durationMin - 10
  return `Z2|${base}|Tirada larga aeróbica Z2 — conversacional, gel c/40min\nZ3|10|Progresión final si te sientes bien`
}

// ---------------------------------------------------------------------------
// HALF_MARATHON_18W
// Fases: Base (1-4), Desarrollo (5-10), Específico (11-15), Afinamiento (16-18)
// Estructura: Lun=fuerza, Mar=Z2, Mié=calidad, Jue=Z1-Z2 recuperación, Vie=Z2, Dom=tirada larga
// ---------------------------------------------------------------------------

const halfMarathonQualityByPhase: Record<string, SessionTemplate> = {
  BASE: {
    dayOfWeek: 3,
    type: 'FARTLEK',
    durationMin: 40,
    zoneTarget: 'Z2-Z3',
    structure: structFartlek(40, 10),
  },
  DESARROLLO: {
    dayOfWeek: 3,
    type: 'TEMPO',
    durationMin: 50,
    zoneTarget: 'Z3-Z4',
    structure: structTempo(50, 30),
  },
  ESPECIFICO: {
    dayOfWeek: 3,
    type: 'INTERVALOS',
    durationMin: 55,
    zoneTarget: 'Z4',
    structure: structIntervalos(55, 6, '1000m'),
  },
  AFINAMIENTO: {
    dayOfWeek: 3,
    type: 'TEMPO',
    durationMin: 40,
    zoneTarget: 'Z3',
    structure: structTempo(40, 20),
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
        type: 'RODAJE_Z2',
        durationMin: 35,
        zoneTarget: 'Z1-Z2',
        structure: 'Recuperación activa. Rodaje muy suave Z1-Z2 — si sientes fatiga, camina. Movilidad de cadera al terminar.',
      },
      {
        dayOfWeek: 5,
        type: 'RODAJE_Z2',
        durationMin: 40,
        zoneTarget: 'Z2',
        structure: 'Rodaje Z2 + 15min fuerza core y movilidad de cadera post-rodaje.',
      },
      {
        dayOfWeek: 7,
        type: 'TIRADA_LARGA',
        durationMin: longRunMin,
        zoneTarget: 'Z2',
        structure: structTiradaLarga(longRunMin, longRunMin >= 70),
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
        { dayOfWeek: 3, type: 'FARTLEK', durationMin: 40, zoneTarget: 'Z2-Z3', structure: structFartlek(40, 5) },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2 + activación muscular.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 55, zoneTarget: 'Z2', structure: structTiradaLarga(55) },
      ],
    },
    {
      weekNumber: 2, phase: 'BASE', volumeKm: 28, isRecoveryWeek: false,
      focusDescription: 'Incremento de volumen base',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 40, zoneTarget: 'N/A', structure: 'Fuerza: incrementar carga 5-10%.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2 estable.' },
        { dayOfWeek: 3, type: 'FARTLEK', durationMin: 45, zoneTarget: 'Z2-Z3', structure: structFartlek(45, 6) },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2 recuperación.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 65, zoneTarget: 'Z2', structure: structTiradaLarga(65) },
      ],
    },
    {
      weekNumber: 3, phase: 'BASE', volumeKm: 32, isRecoveryWeek: false,
      focusDescription: 'Consolidar base aeróbica',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza completa + isométricos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 45, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'TEMPO', durationMin: 45, zoneTarget: 'Z3', structure: structTempo(45, 25) },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 70, zoneTarget: 'Z2', structure: structTiradaLarga(70) },
      ],
    },
    {
      weekNumber: 4, phase: 'BASE', volumeKm: 22, isRecoveryWeek: true,
      focusDescription: 'Semana de recuperación — absorber adaptaciones',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 30, zoneTarget: 'N/A', structure: 'Fuerza ligera. Movilidad y activación.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z1-Z2', structure: 'Rodaje muy suave Z1-Z2.' },
        { dayOfWeek: 4, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje Z2 corto.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 50, zoneTarget: 'Z2', structure: structTiradaLarga(50) },
      ],
    },

    // === DESARROLLO (5-9) ===
    {
      weekNumber: 5, phase: 'DESARROLLO', volumeKm: 34, isRecoveryWeek: false,
      focusDescription: 'Introducir intervalos al ritmo 10K',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza específica corredor.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'INTERVALOS', durationMin: 50, zoneTarget: 'Z4', structure: structIntervalos(50, 4, '1000m') },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 75, zoneTarget: 'Z2', structure: structTiradaLarga(75, true) },
      ],
    },
    {
      weekNumber: 6, phase: 'DESARROLLO', volumeKm: 38, isRecoveryWeek: false,
      focusDescription: 'Aumentar volumen de calidad',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza + pliométricos ligeros.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 45, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'INTERVALOS', durationMin: 55, zoneTarget: 'Z4', structure: structIntervalos(55, 5, '1000m') },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 80, zoneTarget: 'Z2', structure: structTiradaLarga(80, true) },
      ],
    },
    {
      weekNumber: 7, phase: 'DESARROLLO', volumeKm: 40, isRecoveryWeek: false,
      focusDescription: 'Pico de desarrollo',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza máxima corredor.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 45, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'INTERVALOS', durationMin: 60, zoneTarget: 'Z4', structure: structIntervalos(60, 6, '1000m') },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 45, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 85, zoneTarget: 'Z2', structure: structTiradaLarga(85, true) },
      ],
    },
    {
      weekNumber: 8, phase: 'DESARROLLO', volumeKm: 28, isRecoveryWeek: true,
      focusDescription: 'Recuperación antes de fase específica',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 30, zoneTarget: 'N/A', structure: 'Fuerza ligera.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z1-Z2', structure: 'Rodaje suave.' },
        { dayOfWeek: 4, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 60, zoneTarget: 'Z2', structure: structTiradaLarga(60) },
      ],
    },
    {
      weekNumber: 9, phase: 'DESARROLLO', volumeKm: 38, isRecoveryWeek: false,
      focusDescription: 'Simulacro de ritmo 10K',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 45, zoneTarget: 'N/A', structure: 'Fuerza + pliométricos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'SIMULACRO', durationMin: 55, zoneTarget: 'Z4', structure: structSimulacro(55, '5K') },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 40, zoneTarget: 'Z2', structure: 'Rodaje Z2 recuperación post-simulacro.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 80, zoneTarget: 'Z2', structure: structTiradaLarga(80, true) },
      ],
    },

    // === AFINAMIENTO (10-12) ===
    {
      weekNumber: 10, phase: 'AFINAMIENTO', volumeKm: 30, isRecoveryWeek: false,
      focusDescription: 'Reducir volumen, mantener intensidad',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 35, zoneTarget: 'N/A', structure: 'Fuerza ligera — activación.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 3, type: 'INTERVALOS', durationMin: 45, zoneTarget: 'Z4', structure: structIntervalos(45, 4, '1000m') },
        { dayOfWeek: 5, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje Z2 corto.' },
        { dayOfWeek: 7, type: 'TIRADA_LARGA', durationMin: 65, zoneTarget: 'Z2', structure: structTiradaLarga(65) },
      ],
    },
    {
      weekNumber: 11, phase: 'AFINAMIENTO', volumeKm: 20, isRecoveryWeek: false,
      focusDescription: 'Ajuste fino pre-carrera',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 25, zoneTarget: 'N/A', structure: 'Activación muscular ligera.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje Z2 suave.' },
        { dayOfWeek: 3, type: 'TEMPO', durationMin: 35, zoneTarget: 'Z3', structure: structTempo(35, 15) },
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
        { dayOfWeek: 4, type: 'FARTLEK', durationMin: 35, zoneTarget: 'Z2-Z3', structure: structFartlek(35, 4) },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 45, zoneTarget: 'Z2', structure: structTiradaLarga(45) },
      ],
    },
    {
      weekNumber: 2, phase: 'BASE', volumeKm: 22, isRecoveryWeek: false,
      focusDescription: 'Incremento progresivo',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 35, zoneTarget: 'N/A', structure: 'Fuerza + saltos cortos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'FARTLEK', durationMin: 40, zoneTarget: 'Z2-Z3', structure: structFartlek(40, 5) },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 50, zoneTarget: 'Z2', structure: structTiradaLarga(50) },
      ],
    },
    {
      weekNumber: 3, phase: 'BASE', volumeKm: 25, isRecoveryWeek: false,
      focusDescription: 'Consolidar base con primer tempo',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 40, zoneTarget: 'N/A', structure: 'Fuerza + pliométricos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'TEMPO', durationMin: 40, zoneTarget: 'Z3', structure: structTempo(40, 20) },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 55, zoneTarget: 'Z2', structure: structTiradaLarga(55) },
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
        { dayOfWeek: 4, type: 'INTERVALOS', durationMin: 45, zoneTarget: 'Z4-Z5', structure: structIntervalos(45, 6, '400m', 'Z4') },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 55, zoneTarget: 'Z2', structure: structTiradaLarga(55) },
      ],
    },
    {
      weekNumber: 6, phase: 'ESPECIFICO', volumeKm: 28, isRecoveryWeek: false,
      focusDescription: 'Pico de calidad',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 40, zoneTarget: 'N/A', structure: 'Fuerza + pliométricos.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 35, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'INTERVALOS', durationMin: 50, zoneTarget: 'Z4-Z5', structure: structIntervalos(50, 8, '400m', 'Z4') },
        { dayOfWeek: 6, type: 'TIRADA_LARGA', durationMin: 60, zoneTarget: 'Z2', structure: structTiradaLarga(60) },
      ],
    },
    {
      weekNumber: 7, phase: 'ESPECIFICO', volumeKm: 20, isRecoveryWeek: false,
      focusDescription: 'Ajuste fino — piernas descansadas',
      sessions: [
        { dayOfWeek: 1, type: 'FUERZA', durationMin: 30, zoneTarget: 'N/A', structure: 'Activación ligera.' },
        { dayOfWeek: 2, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje Z2.' },
        { dayOfWeek: 4, type: 'INTERVALOS', durationMin: 40, zoneTarget: 'Z4', structure: structIntervalos(40, 5, '400m', 'Z4') },
        { dayOfWeek: 6, type: 'RODAJE_Z2', durationMin: 30, zoneTarget: 'Z2', structure: 'Rodaje suave Z2.' },
      ],
    },
    {
      weekNumber: 8, phase: 'ESPECIFICO', volumeKm: 10, isRecoveryWeek: false,
      focusDescription: 'Semana de carrera',
      sessions: [
        { dayOfWeek: 1, type: 'RODAJE_Z2', durationMin: 20, zoneTarget: 'Z1-Z2', structure: 'Trote suave 20min.' },
        { dayOfWeek: 3, type: 'RODAJE_Z2', durationMin: 20, zoneTarget: 'Z2', structure: '15min suave + 4×100m strides rápidos.' },
        // Día 6 (sáb): descanso antes de carrera — sin sesión planificada
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
      // Día 7 (dom): descanso activo — sin sesión planificada (yoga/movilidad libre)
    ],
  }
}

export const BODY_RECOMPOSITION_16W: PlanTemplate = {
  goalType: 'BODY_RECOMPOSITION',
  totalWeeks: 12,
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

    // === ESPECÍFICO (11-12) — Definición + mantenimiento masa muscular ===
    buildRecompWeek(11, 'ESPECIFICO', 18, false, 'Aumentar cardio, mantener fuerza', 55, 35),
    buildRecompWeek(12, 'ESPECIFICO', 18, false, 'Pico cardio-metabólico y evaluación final', 55, 35),
  ],
}

// ---------------------------------------------------------------------------
// STRENGTH_TRAINING_16W
// Upper/Lower 4 días — sin running
// Fases: Base (1-4), Desarrollo (5-10), Específico (11-14), Afinamiento (15-16)
// Lun=Upper Push, Mar=Lower Quad, Jue=Upper Pull, Vie=Lower Posterior
// ---------------------------------------------------------------------------

function buildStrengthWeek(
  weekNumber: number,
  phase: 'BASE' | 'DESARROLLO' | 'ESPECIFICO' | 'AFINAMIENTO',
  isRecoveryWeek: boolean,
  focusDescription: string,
  upperDuration: number,
  lowerDuration: number,
): WeekTemplate {
  const upperPushStructure: Record<string, string> = {
    BASE:        'Press banca plano 3×10, press inclinado mancuerna 3×12, press militar 3×10, fondos asistidos 3×12, extensión tríceps polea 3×15. Técnica y conexión mente-músculo.',
    DESARROLLO:  'Press banca 4×8, press inclinado barra 4×10, press militar mancuerna 4×10, fondos lastrados 3×10, extensión tríceps 4×12. Sobrecarga progresiva — sube 2.5kg cada semana.',
    ESPECIFICO:  'Press banca 4×6-8 (pesado), press inclinado 4×8, aperturas cable 3×12, press militar 4×8, fondos lastrados 4×8, tríceps polea 4×10. Intensidad alta.',
    AFINAMIENTO: 'Press banca 3×8 (reducir carga 10%), press inclinado 3×10, press militar 3×10, fondos 3×10. Mantener músculo, reducir volumen.',
  }
  const upperPullStructure: Record<string, string> = {
    BASE:        'Jalón al pecho 3×12, remo con polea 3×12, remo mancuerna 3×12 c/lado, curl bíceps barra 3×12, curl martillo 3×15. Base de tracción.',
    DESARROLLO:  'Dominadas asistidas 4×8, remo barra 4×10, remo cable 4×10, curl bíceps 4×10, curl predicador 3×12. Progresión en dominadas.',
    ESPECIFICO:  'Dominadas lastradas 4×6-8, remo barra pesado 4×8, remo inclinado mancuerna 4×10, curl bíceps pesado 4×8, curl concentrado 3×12.',
    AFINAMIENTO: 'Dominadas 3×8, remo barra 3×10, curl bíceps 3×10. Mantener fuerza de tirón.',
  }
  const lowerQuadStructure: Record<string, string> = {
    BASE:        'Sentadilla libre 3×10, prensa pierna 3×12, extensión cuádriceps 3×15, zancada alterna 3×10 c/lado, pantorrilla de pie 4×15. Técnica de sentadilla.',
    DESARROLLO:  'Sentadilla 4×8, prensa 4×10, extensión cuádriceps 4×12, zancada búlgara 3×10 c/lado, pantorrilla 4×12. Añadir carga progresiva.',
    ESPECIFICO:  'Sentadilla frontal 4×6-8 (pesado), hack squat 4×8, prensa 4×10, extensión cuádriceps 4×10, zancada búlgara 4×8 c/lado.',
    AFINAMIENTO: 'Sentadilla 3×8, prensa 3×10, extensión 3×12. Volumen reducido.',
  }
  const lowerPosteriorStructure: Record<string, string> = {
    BASE:        'Peso muerto convencional 3×8, hip thrust 3×12, curl femoral 3×15, buenos días 3×12, abducción cadera 3×15. Base de cadena posterior.',
    DESARROLLO:  'Peso muerto 4×6, hip thrust 4×10, curl femoral 4×12, peso muerto rumano 3×10, abducción 3×15. Progresión en peso muerto.',
    ESPECIFICO:  'Peso muerto 4×5-6 (pesado), hip thrust lastrado 4×8, curl femoral 4×10, peso muerto rumano 4×8, glúteo en cable 3×12.',
    AFINAMIENTO: 'Peso muerto 3×6, hip thrust 3×10, curl femoral 3×12. Mantener fuerza posterior.',
  }

  return {
    weekNumber,
    phase,
    volumeKm: 0,
    isRecoveryWeek,
    focusDescription,
    sessions: [
      {
        dayOfWeek: 1,
        type: 'FUERZA',
        durationMin: upperDuration,
        zoneTarget: 'N/A',
        structure: upperPushStructure[phase],
      },
      {
        dayOfWeek: 2,
        type: 'FUERZA',
        durationMin: lowerDuration,
        zoneTarget: 'N/A',
        structure: lowerQuadStructure[phase],
      },
      {
        dayOfWeek: 4,
        type: 'FUERZA',
        durationMin: upperDuration,
        zoneTarget: 'N/A',
        structure: upperPullStructure[phase],
      },
      {
        dayOfWeek: 5,
        type: 'FUERZA',
        durationMin: lowerDuration,
        zoneTarget: 'N/A',
        structure: lowerPosteriorStructure[phase],
      },
    ],
  }
}

export const STRENGTH_TRAINING_16W: PlanTemplate = {
  goalType: 'STRENGTH_TRAINING',
  totalWeeks: 12,
  weeks: [
    // === BASE (1-4) — Técnica y activación neuromuscular ===
    buildStrengthWeek(1, 'BASE', false, 'Técnica de movimientos básicos — conexión mente-músculo', 50, 50),
    buildStrengthWeek(2, 'BASE', false, 'Consolidar patrones motores — incremento leve de carga', 55, 55),
    buildStrengthWeek(3, 'BASE', false, 'Primer pico de volumen — 4 series en ejercicios principales', 60, 60),
    buildStrengthWeek(4, 'BASE', true,  'Semana de descarga — dejar que el cuerpo absorba adaptaciones', 40, 40),

    // === DESARROLLO (5-10) — Hipertrofia y sobrecarga progresiva ===
    buildStrengthWeek(5,  'DESARROLLO', false, 'Sobrecarga progresiva — subir 2.5kg/semana en compuestos', 60, 65),
    buildStrengthWeek(6,  'DESARROLLO', false, 'Incremento de intensidad — menos reps, más peso', 65, 65),
    buildStrengthWeek(7,  'DESARROLLO', false, 'Pico de volumen — mayor estímulo de hipertrofia', 65, 70),
    buildStrengthWeek(8,  'DESARROLLO', true,  'Descarga — reducir volumen 40%, mantener intensidad', 45, 45),
    buildStrengthWeek(9,  'DESARROLLO', false, 'Retomar con más carga tras descarga', 65, 70),
    buildStrengthWeek(10, 'DESARROLLO', true,  'Transición a fase específica — deload ligero', 50, 50),

    // === ESPECÍFICO (11-12) — Fuerza máxima ===
    buildStrengthWeek(11, 'ESPECIFICO', false, 'Trabajo pesado — rango 4-6 reps en compuestos', 65, 70),
    buildStrengthWeek(12, 'ESPECIFICO', false, 'Pico de fuerza — cargas máximas y test de rendimiento', 65, 70),
  ],
}

// ---------------------------------------------------------------------------
// Índice de plantillas
// ---------------------------------------------------------------------------

export const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
  // Running — templates propios
  RACE_5K:            FIVE_K_8W,
  RACE_10K:           TEN_K_12W,
  RACE_HALF_MARATHON: HALF_MARATHON_18W,
  RACE_MARATHON:      HALF_MARATHON_18W,        // base aeróbica — template maratón pendiente

  // Fuerza
  STRENGTH_TRAINING:  STRENGTH_TRAINING_16W,     // Upper/Lower 4 días — sin running

  // Composición corporal
  BODY_RECOMPOSITION: BODY_RECOMPOSITION_16W,

  // Fallbacks genéricos
  GENERAL_FITNESS:    BODY_RECOMPOSITION_16W,
  WEIGHT_LOSS:        BODY_RECOMPOSITION_16W,
}

export function getTemplate(goalType: string): PlanTemplate | null {
  return PLAN_TEMPLATES[goalType] ?? null
}
