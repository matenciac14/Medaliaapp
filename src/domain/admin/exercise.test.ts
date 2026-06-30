import { describe, it, expect } from 'vitest'
import {
  validateExercise,
  isGlobalExercise,
  EQUIPMENT_LABEL,
  CATEGORY_LABEL,
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
} from './exercise'

// ---------------------------------------------------------------------------
// validateExercise
// ---------------------------------------------------------------------------
describe('validateExercise', () => {
  function valid() {
    return {
      name: 'Sentadilla',
      category: 'COMPOUND',
      equipment: 'BARBELL',
      muscleGroups: ['QUADRICEPS', 'GLUTES'],
    }
  }

  it('ejercicio válido → sin errores', () => {
    expect(validateExercise(valid())).toHaveLength(0)
  })

  it('nombre vacío → error', () => {
    const errs = validateExercise({ ...valid(), name: '' })
    expect(errs.some((e) => e.includes('nombre'))).toBe(true)
  })

  it('nombre solo espacios → error', () => {
    const errs = validateExercise({ ...valid(), name: '   ' })
    expect(errs.length).toBeGreaterThan(0)
  })

  it('nombre > 120 chars → error', () => {
    const errs = validateExercise({ ...valid(), name: 'A'.repeat(121) })
    expect(errs.some((e) => e.includes('120'))).toBe(true)
  })

  it('nombre de exactamente 120 chars → válido', () => {
    expect(validateExercise({ ...valid(), name: 'A'.repeat(120) })).toHaveLength(0)
  })

  it('categoría inválida → error', () => {
    const errs = validateExercise({ ...valid(), category: 'INVALID_CAT' })
    expect(errs.some((e) => e.includes('Categoría'))).toBe(true)
  })

  it('todas las categorías válidas → sin error de categoría', () => {
    for (const cat of EXERCISE_CATEGORIES) {
      const errs = validateExercise({ ...valid(), category: cat })
      expect(errs.some((e) => e.includes('Categoría'))).toBe(false)
    }
  })

  it('equipamiento inválido → error', () => {
    const errs = validateExercise({ ...valid(), equipment: 'ROCKET' })
    expect(errs.some((e) => e.includes('Equipamiento'))).toBe(true)
  })

  it('todos los equipamientos válidos → sin error de equipamiento', () => {
    for (const eq of EQUIPMENT_TYPES) {
      const errs = validateExercise({ ...valid(), equipment: eq })
      expect(errs.some((e) => e.includes('Equipamiento'))).toBe(false)
    }
  })

  it('muscleGroups vacío → error', () => {
    const errs = validateExercise({ ...valid(), muscleGroups: [] })
    expect(errs.some((e) => e.includes('muscular'))).toBe(true)
  })

  it('puede tener múltiples errores simultáneos', () => {
    const errs = validateExercise({ name: '', category: 'BAD', equipment: 'BAD', muscleGroups: [] })
    expect(errs.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// isGlobalExercise
// ---------------------------------------------------------------------------
describe('isGlobalExercise', () => {
  it('coachId null + isGlobal true → global', () => {
    expect(isGlobalExercise({ coachId: null, isGlobal: true })).toBe(true)
  })

  it('coachId null + isGlobal false → no global', () => {
    expect(isGlobalExercise({ coachId: null, isGlobal: false })).toBe(false)
  })

  it('coachId definido + isGlobal true → no global (ejercicio personalizado)', () => {
    expect(isGlobalExercise({ coachId: 'coach-123', isGlobal: true })).toBe(false)
  })

  it('coachId definido + isGlobal false → no global', () => {
    expect(isGlobalExercise({ coachId: 'coach-123', isGlobal: false })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Labels — cobertura de los maps
// ---------------------------------------------------------------------------
describe('EQUIPMENT_LABEL', () => {
  it('todos los equipamientos tienen label', () => {
    for (const eq of EQUIPMENT_TYPES) {
      expect(EQUIPMENT_LABEL[eq]).toBeTruthy()
    }
  })
})

describe('CATEGORY_LABEL', () => {
  it('todas las categorías tienen label', () => {
    for (const cat of EXERCISE_CATEGORIES) {
      expect(CATEGORY_LABEL[cat]).toBeTruthy()
    }
  })
})
