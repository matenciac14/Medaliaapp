import { describe, it, expect } from 'vitest'
import { isoWeekKey, weekLabel, lastNWeekKeys, computeWAU } from './wau'

// Fecha de referencia fija: lunes 30 junio 2026 (semana 27)
const REF = new Date('2026-06-30T12:00:00Z')

describe('isoWeekKey', () => {
  it('devuelve la semana ISO correcta', () => {
    expect(isoWeekKey(new Date('2026-06-30'))).toBe('2026-W27')
    expect(isoWeekKey(new Date('2026-01-01'))).toBe('2026-W01')
    expect(isoWeekKey(new Date('2026-12-31'))).toBe('2026-W53')
  })

  it('dos fechas en la misma semana dan la misma key', () => {
    const mon = isoWeekKey(new Date('2026-06-29T12:00:00Z'))
    const sun = isoWeekKey(new Date('2026-07-05T12:00:00Z'))
    expect(mon).toBe(sun)
  })
})

describe('weekLabel', () => {
  it('convierte key a label corto', () => {
    expect(weekLabel('2026-W27')).toBe('Sem 27')
    expect(weekLabel('2026-W01')).toBe('Sem 1')
  })
})

describe('lastNWeekKeys', () => {
  it('devuelve N semanas únicas ordenadas', () => {
    const keys = lastNWeekKeys(4, REF)
    expect(keys).toHaveLength(4)
    expect(keys[3]).toBe('2026-W27') // más reciente
    expect(keys[0]).toBe('2026-W24') // más antiguo
  })

  it('las semanas están en orden ascendente', () => {
    const keys = lastNWeekKeys(8, REF)
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true)
    }
  })
})

describe('computeWAU', () => {
  it('devuelve 8 buckets por defecto', () => {
    const result = computeWAU([], 8, REF)
    expect(result).toHaveLength(8)
  })

  it('cuenta usuarios únicos por semana (no duplica si tiene varios eventos)', () => {
    const events = [
      { userId: 'u1', date: new Date('2026-06-29') }, // semana 27
      { userId: 'u1', date: new Date('2026-06-30') }, // semana 27 — mismo user
      { userId: 'u2', date: new Date('2026-06-30') }, // semana 27
    ]
    const result = computeWAU(events, 4, REF)
    const w27 = result.find((b) => b.key === '2026-W27')!
    expect(w27.count).toBe(2) // u1 + u2, no 3
  })

  it('mezcla eventos de SessionLog y CheckIn sin duplicar el mismo user', () => {
    const events = [
      { userId: 'u1', date: new Date('2026-06-22T12:00:00Z') }, // semana 26
      { userId: 'u1', date: new Date('2026-06-23T12:00:00Z') }, // semana 26 — misma persona, distinta fuente
      { userId: 'u2', date: new Date('2026-06-22T12:00:00Z') }, // semana 26
    ]
    const result = computeWAU(events, 4, REF)
    const w26 = result.find((b) => b.key === '2026-W26')!
    expect(w26.count).toBe(2)
  })

  it('eventos fuera del rango de semanas se ignoran', () => {
    const events = [
      { userId: 'u1', date: new Date('2025-01-01') }, // muy antiguo
      { userId: 'u2', date: new Date('2026-06-30') }, // semana 27 — dentro
    ]
    const result = computeWAU(events, 4, REF)
    const total = result.reduce((s, b) => s + b.count, 0)
    expect(total).toBe(1) // solo u2
  })

  it('devuelve 0 para semanas sin actividad', () => {
    const events = [
      { userId: 'u1', date: new Date('2026-06-30') }, // solo semana 27
    ]
    const result = computeWAU(events, 4, REF)
    const semanas0 = result.filter((b) => b.key !== '2026-W27')
    expect(semanas0.every((b) => b.count === 0)).toBe(true)
  })

  it('los buckets están ordenados del más antiguo al más reciente', () => {
    const result = computeWAU([], 8, REF)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].key > result[i - 1].key).toBe(true)
    }
  })
})
