import { describe, it, expect } from 'vitest'
import { computeCoachActivity } from './coach_activity'

const COACHES = new Set(['c1', 'c2', 'c3'])

describe('computeCoachActivity', () => {
  it('detecta coach activo por mensaje enviado', () => {
    const result = computeCoachActivity(['c1'], [], COACHES)
    expect(result.activeIds.has('c1')).toBe(true)
    expect(result.activeCount).toBe(1)
  })

  it('detecta coach activo por pago registrado', () => {
    const result = computeCoachActivity([], ['c2'], COACHES)
    expect(result.activeIds.has('c2')).toBe(true)
    expect(result.activeCount).toBe(1)
  })

  it('combina ambas señales sin duplicar el mismo coach', () => {
    // c1 aparece en mensajes Y en pagos
    const result = computeCoachActivity(['c1', 'c1'], ['c1', 'c2'], COACHES)
    expect(result.activeIds.has('c1')).toBe(true)
    expect(result.activeIds.has('c2')).toBe(true)
    expect(result.activeCount).toBe(2)
  })

  it('filtra mensajes de atletas — solo cuenta coaches registrados', () => {
    // 'a1' es un atleta, no está en COACHES
    const result = computeCoachActivity(['a1', 'c1'], [], COACHES)
    expect(result.activeIds.has('a1')).toBe(false)
    expect(result.activeIds.has('c1')).toBe(true)
    expect(result.activeCount).toBe(1)
  })

  it('calcula inactiveCount correctamente', () => {
    // 3 coaches totales, solo c1 activo
    const result = computeCoachActivity(['c1'], [], COACHES)
    expect(result.totalCount).toBe(3)
    expect(result.activeCount).toBe(1)
    expect(result.inactiveCount).toBe(2)
  })

  it('devuelve todo inactivo si no hay eventos', () => {
    const result = computeCoachActivity([], [], COACHES)
    expect(result.activeCount).toBe(0)
    expect(result.inactiveCount).toBe(3)
    expect(result.activeIds.size).toBe(0)
  })

  it('funciona con coaches vacíos (sin coaches registrados)', () => {
    const result = computeCoachActivity(['c1'], ['c2'], new Set())
    expect(result.activeCount).toBe(0)
    expect(result.totalCount).toBe(0)
  })

  it('todos los coaches activos', () => {
    const result = computeCoachActivity([], ['c1', 'c2', 'c3'], COACHES)
    expect(result.activeCount).toBe(3)
    expect(result.inactiveCount).toBe(0)
  })
})
