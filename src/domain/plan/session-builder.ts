/**
 * Pure functions for building planned sessions from templates.
 * No Prisma, no AI, no side effects — fully testable.
 * Extracted from src/lib/plan/generator.ts.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type CardioMachine = 'TREADMILL' | 'ELLIPTICAL' | 'BIKE' | 'ROWING' | 'ANY'
export type MuscleGroupSplit = 'PUSH' | 'PULL' | 'LEGS' | 'FULL_BODY'

export type DayConfig =
  | { type: 'rest' }
  | { type: 'cardio'; cardioMachine?: CardioMachine }
  | { type: 'strength'; split?: MuscleGroupSplit }

export type WeekSchedule = Record<1 | 2 | 3 | 4 | 5 | 6 | 7, DayConfig>

export type HRZones = {
  z1?: { min: number; max: number }
  z2: { min: number; max: number }
  z3: { min: number; max: number }
  z4: { min: number; max: number }
  z5?: { min: number; max: number }
}

export type BuiltSession = {
  weekId: string
  dayOfWeek: number
  type: string
  intensity: 'HIGH' | 'MODERATE' | 'LOW' | 'REST'
  durationMin: number
  zoneTarget: string | null
  detailText: string
  date: Date
}

export type GymExercise = {
  id: string
  name: string
  muscleGroups: string[]
  equipment: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const SPLIT_EXERCISES: Record<MuscleGroupSplit, Record<string, string[]>> = {
  PUSH: {
    BEGINNER:     ['Press declinado con mancuernas', 'Elevación lateral con mancuernas', 'Push down en polea', 'Press Arnold'],
    INTERMEDIATE: ['Press plano con barra', 'Press Arnold', 'Elevación lateral con mancuernas', 'Cruces en polea alta', 'Push down en polea'],
    ADVANCED:     ['Press plano con barra', 'Press inclinado con barra', 'Press Arnold', 'Elevación lateral con mancuernas', 'Cruces en polea alta', 'Press francés'],
  },
  PULL: {
    BEGINNER:     ['Jalón polea alta', 'Remo con mancuernas', 'Curl martillo con mancuernas', 'Elevación frontal con mancuernas'],
    INTERMEDIATE: ['Jalón polea alta', 'Remo con barra', 'Curl martillo con mancuernas', 'Curl concentrado con mancuernas', 'Pájaros'],
    ADVANCED:     ['Dominadas', 'Remo con barra', 'Jalón polea alta', 'Curl martillo con mancuernas', 'Curl predicador', 'Pájaros'],
  },
  LEGS: {
    BEGINNER:     ['Prensa de piernas', 'Extensión de rodillas en máquina', 'Flexión de rodillas acostado', 'Elevación de talones en máquina'],
    INTERMEDIATE: ['Sentadilla sumo con barra', 'Prensa de piernas', 'Flexión de rodillas sentado', 'Abducción en máquina', 'Elevación de talones en máquina'],
    ADVANCED:     ['Sentadilla frontal con barra', 'Hip thrust con barra', 'Peso muerto con barra', 'Sentadilla hack en máquina', 'Extensión de rodillas en máquina', 'Elevación de talones en máquina'],
  },
  FULL_BODY: {
    BEGINNER:     ['Prensa de piernas', 'Jalón polea alta', 'Press declinado con mancuernas', 'Elevación lateral con mancuernas'],
    INTERMEDIATE: ['Sentadilla sumo con barra', 'Remo con mancuernas', 'Press Arnold', 'Curl martillo con mancuernas', 'Push down en polea'],
    ADVANCED:     ['Sentadilla frontal con barra', 'Dominadas', 'Press plano con barra', 'Press militar con barra', 'Curl martillo con mancuernas', 'Push down en polea'],
  },
}

export const SPLIT_LABELS: Record<MuscleGroupSplit, string> = {
  PUSH:      'Push — Pecho, Hombros, Tríceps',
  PULL:      'Pull — Espalda, Bíceps',
  LEGS:      'Piernas — Cuádriceps, Glúteos',
  FULL_BODY: 'Full Body',
}

const MACHINE_NAMES: Record<CardioMachine, string> = {
  TREADMILL: 'cinta',
  ELLIPTICAL: 'elíptica',
  BIKE:       'bici estática',
  ROWING:     'remo',
  ANY:        'máquina cardio',
}

// ── Pure functions ─────────────────────────────────────────────────────────────

/** Calculates the date of a session given plan start, week index, and day of week (1=Mon). */
export function sessionDate(planStart: Date, weekIndex: number, dayOfWeek: number): Date {
  const date = new Date(planStart)
  date.setDate(date.getDate() + weekIndex * 7)
  const currentDow = date.getDay()
  const targetDow = dayOfWeek % 7
  const diff = (targetDow - currentDow + 7) % 7
  date.setDate(date.getDate() + diff)
  return date
}

/** Maps session type string to intensity enum. */
export function getSessionIntensity(type: string): 'HIGH' | 'MODERATE' | 'LOW' | 'REST' {
  switch (type) {
    case 'INTERVALOS':
    case 'TIRADA_LARGA':
    case 'SIMULACRO':
    case 'TEST':
      return 'HIGH'
    case 'TEMPO':
    case 'FARTLEK':
    case 'CICLA':
    case 'NATACION':
    case 'FUERZA':
    case 'OTRO':
      return 'MODERATE'
    case 'RODAJE_Z2':
      return 'LOW'
    case 'DESCANSO':
      return 'REST'
    default:
      return 'MODERATE'
  }
}

/** Returns the sets×reps scheme for a given training phase. */
export function getSetsRepsScheme(phase: string): string {
  switch (phase) {
    case 'BASE':        return '3×12-15'
    case 'DESARROLLO':  return '4×10-12'
    case 'ESPECIFICO':
    case 'ESPECÍFICO':  return '4×8-10'
    default:            return '3×10-12' // AFINAMIENTO
  }
}

/** Builds the structure text for a strength session. */
export function buildStrengthStructure(
  split: MuscleGroupSplit,
  exercises: GymExercise[],
  durationMin: number,
  phase: string
): string {
  const scheme = getSetsRepsScheme(phase)
  const splitLabel = SPLIT_LABELS[split]
  const lines = exercises.map(e => `${scheme} ${e.name}`)
  return `${durationMin} min · ${splitLabel}\n${lines.join('\n')}`
}

/** Builds the structure and zone target for a cardio machine session. */
export function buildCardioStructure(
  machine: CardioMachine,
  durationMin: number,
  phase: string,
  hrZones: HRZones
): { zoneTarget: string; structure: string } {
  const m = MACHINE_NAMES[machine] ?? 'máquina cardio'
  const z2 = `${hrZones.z2.min}–${hrZones.z2.max} bpm`
  const z3 = `${hrZones.z3.min}–${hrZones.z3.max} bpm`
  const warm = 5
  const cool = 5
  const main = durationMin - warm - cool

  switch (phase) {
    case 'BASE':
      return {
        zoneTarget: 'Z2',
        structure: `${durationMin} min en ${m} · ${warm} min calentamiento suave · ${main} min Zona 2 (${z2}) ritmo conversacional · ${cool} min vuelta calma`,
      }
    case 'DESARROLLO':
      return {
        zoneTarget: 'Z2-Z3',
        structure: `${durationMin} min en ${m} · ${warm} min calentamiento Z1 · ${main - 8} min Z2 continuo (${z2}) · 8 min Z3 progresivo (${z3}) · ${cool} min vuelta calma`,
      }
    case 'ESPECIFICO':
      return {
        zoneTarget: 'Z2-Z3',
        structure: `${durationMin} min en ${m} · ${warm} min calentamiento · ${main - 10} min Z2 (${z2}) · 10 min Z3 sostenido (${z3}) · ${cool} min enfriamiento`,
      }
    default: // AFINAMIENTO
      return {
        zoneTarget: 'Z1-Z2',
        structure: `${durationMin} min en ${m} · Recuperación activa · No superar ${hrZones.z2.max} bpm · Ritmo muy suave, sin esfuerzo`,
      }
  }
}

/** Builds sessions for a schedule-based plan (GYM goal type). */
export function buildScheduledSessions(
  weekId: string,
  week: { phase: string },
  schedule: WeekSchedule,
  planStart: Date,
  weekIndex: number,
  hrZones: HRZones,
  hoursPerSession: number,
  gymExercises: Record<string, GymExercise[]> = {}
): BuiltSession[] {
  const durationMin = Math.round(hoursPerSession * 60)

  return ([1, 2, 3, 4, 5, 6, 7] as const)
    .filter((dow) => schedule[dow]?.type !== 'rest')
    .map((dow): BuiltSession => {
      const day = schedule[dow] as DayConfig
      if (day.type === 'cardio') {
        const cardio = buildCardioStructure(
          (day as { type: 'cardio'; cardioMachine?: CardioMachine }).cardioMachine ?? 'ANY',
          durationMin,
          week.phase,
          hrZones
        )
        return {
          weekId,
          dayOfWeek: dow,
          type: 'OTRO',
          intensity: 'MODERATE',
          durationMin,
          zoneTarget: cardio.zoneTarget,
          detailText: cardio.structure,
          date: sessionDate(planStart, weekIndex, dow),
        }
      }
      const split = (day as { type: 'strength'; split?: MuscleGroupSplit }).split
      const exercises = split ? (gymExercises[split] ?? []) : []
      const structure = split && exercises.length > 0
        ? buildStrengthStructure(split, exercises, durationMin, week.phase)
        : `Sesión de fuerza ${durationMin} min — Ver ejercicios en el tracker de gym`
      return {
        weekId,
        dayOfWeek: dow,
        type: 'FUERZA',
        intensity: 'MODERATE',
        durationMin,
        zoneTarget: null,
        detailText: structure,
        date: sessionDate(planStart, weekIndex, dow),
      }
    })
}
