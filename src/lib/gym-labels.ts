/** Labels en español para los valores de bodyPart y target de WorkoutX. */

export const BODY_PART_LABELS: Record<string, string> = {
  'back':         'Espalda',
  'cardio':       'Cardio',
  'chest':        'Pecho',
  'lower arms':   'Antebrazos',
  'lower legs':   'Pantorrillas',
  'neck':         'Cuello',
  'shoulders':    'Hombros',
  'upper arms':   'Brazos',
  'upper legs':   'Piernas',
  'waist':        'Core',
}

export const TARGET_LABELS: Record<string, string> = {
  'abs':               'Abdominales',
  'adductor longus':   'Aductores',
  'biceps':            'Bíceps',
  'calves':            'Pantorrillas',
  'cardiovascular system': 'Sistema cardiovascular',
  'delts':             'Deltoides',
  'forearms':          'Antebrazos',
  'glutes':            'Glúteos',
  'hamstrings':        'Isquiotibiales',
  'lats':              'Dorsales',
  'levator scapulae':  'Elevador de escápula',
  'pectorals':         'Pectoral',
  'quads':             'Cuádriceps',
  'serratus anterior': 'Serrato anterior',
  'spine':             'Columna',
  'traps':             'Trapecios',
  'triceps':           'Tríceps',
  'upper back':        'Espalda alta',
}

/** Compat — WorkoutDay.muscleGroups sigue usando strings UPPERCASE (ej. 'CHEST', 'BACK'). */
const LEGACY_MUSCLE_LABELS: Record<string, string> = {
  CHEST:       'Pecho',
  BACK:        'Espalda',
  SHOULDERS:   'Hombros',
  BICEPS:      'Bíceps',
  TRICEPS:     'Tríceps',
  QUADRICEPS:  'Cuádriceps',
  HAMSTRINGS:  'Isquiotibiales',
  GLUTES:      'Glúteos',
  CALVES:      'Pantorrillas',
  CORE:        'Core',
  FOREARMS:    'Antebrazos',
  TRAPS:       'Trapecios',
  LATS:        'Dorsales',
  ABS:         'Abdominales',
}

export function translateMuscleGroup(mg: string): string {
  return LEGACY_MUSCLE_LABELS[mg]
    ?? BODY_PART_LABELS[mg.toLowerCase()]
    ?? mg.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

export function translateBodyPart(bodyPart: string): string {
  return BODY_PART_LABELS[bodyPart.toLowerCase()]
    ?? bodyPart.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

export function translateTarget(target: string): string {
  return TARGET_LABELS[target.toLowerCase()]
    ?? target.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}
