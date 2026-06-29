export const MUSCLE_GROUP_LABELS: Record<string, string> = {
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
  CHEST_UPPER: 'Pecho superior',
  CHEST_LOWER: 'Pecho inferior',
}

export function translateMuscleGroup(mg: string): string {
  return MUSCLE_GROUP_LABELS[mg] ?? mg.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}
