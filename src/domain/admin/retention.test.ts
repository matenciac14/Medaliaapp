import { describe, it, expect } from 'vitest'
import { activeUserIdsInWindow, computeRetention, retentionColor } from './retention'

const REF = new Date('2026-06-30T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const WINDOW_14 = 14 * DAY

describe('activeUserIdsInWindow', () => {
  it('incluye eventos dentro de la ventana', () => {
    const events = [
      { userId: 'u1', date: new Date(REF.getTime() - 3 * DAY) },  // 3 días atrás — dentro
      { userId: 'u2', date: new Date(REF.getTime() - 13 * DAY) }, // 13 días atrás — dentro
    ]
    const result = activeUserIdsInWindow(events, WINDOW_14, REF)
    expect(result.has('u1')).toBe(true)
    expect(result.has('u2')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('excluye eventos fuera de la ventana', () => {
    const events = [
      { userId: 'u1', date: new Date(REF.getTime() - 15 * DAY) }, // 15 días — fuera
      { userId: 'u2', date: new Date(REF.getTime() - 14 * DAY - 1) }, // justo fuera
    ]
    const result = activeUserIdsInWindow(events, WINDOW_14, REF)
    expect(result.size).toBe(0)
  })

  it('incluye evento exactamente en el límite de la ventana', () => {
    const events = [
      { userId: 'u1', date: new Date(REF.getTime() - 14 * DAY) }, // exactamente en límite
    ]
    const result = activeUserIdsInWindow(events, WINDOW_14, REF)
    expect(result.has('u1')).toBe(true)
  })

  it('deduplica el mismo userId con múltiples eventos', () => {
    const events = [
      { userId: 'u1', date: new Date(REF.getTime() - 1 * DAY) },
      { userId: 'u1', date: new Date(REF.getTime() - 5 * DAY) },
      { userId: 'u1', date: new Date(REF.getTime() - 10 * DAY) },
    ]
    const result = activeUserIdsInWindow(events, WINDOW_14, REF)
    expect(result.size).toBe(1)
  })

  it('mezcla eventos de distintas fuentes (SessionLog + CheckIn)', () => {
    const events = [
      { userId: 'u1', date: new Date(REF.getTime() - 2 * DAY) },  // session
      { userId: 'u1', date: new Date(REF.getTime() - 7 * DAY) },  // checkin — mismo user
      { userId: 'u2', date: new Date(REF.getTime() - 4 * DAY) },  // otra persona
    ]
    const result = activeUserIdsInWindow(events, WINDOW_14, REF)
    expect(result.size).toBe(2)
  })

  it('devuelve set vacío si no hay eventos', () => {
    const result = activeUserIdsInWindow([], WINDOW_14, REF)
    expect(result.size).toBe(0)
  })
})

describe('computeRetention', () => {
  it('calcula la tasa correctamente', () => {
    const ids = new Set(['u1', 'u2', 'u3'])
    const result = computeRetention(ids, 10)
    expect(result.activeCount).toBe(3)
    expect(result.baseCount).toBe(10)
    expect(result.rate).toBe(30)
  })

  it('redondea al entero más cercano', () => {
    const ids = new Set(['u1', 'u2'])
    const result = computeRetention(ids, 3) // 2/3 = 66.66...
    expect(result.rate).toBe(67)
  })

  it('devuelve rate 0 si baseCount es 0 (sin división por cero)', () => {
    const result = computeRetention(new Set(), 0)
    expect(result.rate).toBe(0)
  })

  it('devuelve rate 100 si todos están activos', () => {
    const ids = new Set(['u1', 'u2', 'u3'])
    const result = computeRetention(ids, 3)
    expect(result.rate).toBe(100)
  })
})

describe('retentionColor', () => {
  it('verde para ≥ 70%', () => {
    expect(retentionColor(70)).toBe('#16a34a')
    expect(retentionColor(100)).toBe('#16a34a')
  })

  it('amber para ≥ 40% y < 70%', () => {
    expect(retentionColor(40)).toBe('#ea580c')
    expect(retentionColor(69)).toBe('#ea580c')
  })

  it('rojo para < 40%', () => {
    expect(retentionColor(39)).toBe('#dc2626')
    expect(retentionColor(0)).toBe('#dc2626')
  })
})
