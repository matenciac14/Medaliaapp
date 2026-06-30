/**
 * Lógica pura para ejercicios globales del panel admin.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

export const EQUIPMENT_TYPES = [
  'BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'SMITH',
  'BODYWEIGHT', 'KETTLEBELL', 'BAND', 'OTHER',
] as const
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

export const EXERCISE_CATEGORIES = [
  'COMPOUND', 'ISOLATION', 'CARDIO', 'STRETCH', 'FUNCTIONAL',
] as const
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number]

export const EQUIPMENT_LABEL: Record<EquipmentType, string> = {
  BARBELL:    'Barra',
  DUMBBELL:   'Mancuernas',
  MACHINE:    'Máquina',
  CABLE:      'Cable',
  SMITH:      'Smith',
  BODYWEIGHT: 'Peso corporal',
  KETTLEBELL: 'Kettlebell',
  BAND:       'Banda elástica',
  OTHER:      'Otro',
}

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  COMPOUND:   'Compuesto',
  ISOLATION:  'Aislamiento',
  CARDIO:     'Cardio',
  STRETCH:    'Movilidad',
  FUNCTIONAL: 'Funcional',
}

export type ExerciseInput = {
  name: string
  category: string
  equipment: string
  muscleGroups: string[]
  description?: string | null
  tips?: string | null
}

/**
 * Valida los campos de un ejercicio antes de persistir.
 * Devuelve lista de mensajes de error (vacía = válido).
 */
export function validateExercise(input: ExerciseInput): string[] {
  const errors: string[] = []

  if (!input.name.trim()) {
    errors.push('El nombre del ejercicio es obligatorio.')
  } else if (input.name.trim().length > 120) {
    errors.push('El nombre no puede superar 120 caracteres.')
  }

  if (!EXERCISE_CATEGORIES.includes(input.category as ExerciseCategory)) {
    errors.push(`Categoría inválida: ${input.category}.`)
  }

  if (!EQUIPMENT_TYPES.includes(input.equipment as EquipmentType)) {
    errors.push(`Equipamiento inválido: ${input.equipment}.`)
  }

  if (!Array.isArray(input.muscleGroups) || input.muscleGroups.length === 0) {
    errors.push('Selecciona al menos un grupo muscular.')
  }

  return errors
}

/**
 * Determina si un ejercicio es global (librería base de Medaliq).
 * coachId null + isGlobal true = global.
 */
export function isGlobalExercise(exercise: { coachId: string | null; isGlobal: boolean }): boolean {
  return exercise.coachId === null && exercise.isGlobal
}
