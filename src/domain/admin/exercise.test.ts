import { describe, it, expect } from 'vitest'
import { validateExercise } from './exercise'

describe('validateExercise', () => {
  function valid() {
    return {
      name: 'Sentadilla',
      bodyPart: 'upper legs',
      target: 'quads',
      equipment: 'barbell',
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

  it('bodyPart vacío → error', () => {
    const errs = validateExercise({ ...valid(), bodyPart: '' })
    expect(errs.some((e) => e.includes('bodyPart'))).toBe(true)
  })

  it('target vacío → error', () => {
    const errs = validateExercise({ ...valid(), target: '' })
    expect(errs.some((e) => e.includes('target'))).toBe(true)
  })

  it('equipment vacío → error', () => {
    const errs = validateExercise({ ...valid(), equipment: '' })
    expect(errs.some((e) => e.includes('equipamiento'))).toBe(true)
  })

  it('puede tener múltiples errores simultáneos', () => {
    const errs = validateExercise({ name: '', bodyPart: '', target: '', equipment: '' })
    expect(errs.length).toBeGreaterThanOrEqual(3)
  })
})
