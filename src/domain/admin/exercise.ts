/**
 * Lógica pura para ejercicios del panel admin.
 * Sin dependencias de Prisma, Next.js ni ningún framework.
 */

export type ExerciseInput = {
  name: string
  bodyPart: string
  target: string
  equipment: string
  description?: string | null
}

/**
 * Valida los campos de un ejercicio antes de persistir.
 * Devuelve lista de mensajes de error (vacía = válido).
 */
export function validateExercise(input: ExerciseInput): string[] {
  const errors: string[] = []

  if (!input.name?.trim()) {
    errors.push('El nombre del ejercicio es obligatorio.')
  } else if (input.name.trim().length > 120) {
    errors.push('El nombre no puede superar 120 caracteres.')
  }

  if (!input.bodyPart?.trim()) {
    errors.push('La parte del cuerpo (bodyPart) es obligatoria.')
  }

  if (!input.target?.trim()) {
    errors.push('El músculo objetivo (target) es obligatorio.')
  }

  if (!input.equipment?.trim()) {
    errors.push('El equipamiento es obligatorio.')
  }

  return errors
}
