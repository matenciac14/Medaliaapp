import { describe, it, expect } from 'vitest'
import { calcAge } from './calc-age'

function dobYearsAgo(years: number, monthOffset = 0): Date {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  d.setMonth(d.getMonth() + monthOffset)
  return d
}

describe('calcAge', () => {
  it('retorna null para null', () => expect(calcAge(null)).toBeNull())
  it('retorna null para undefined', () => expect(calcAge(undefined)).toBeNull())
  it('retorna null para string inválida', () => expect(calcAge('not-a-date')).toBeNull())

  it('calcula correctamente 30 años', () => {
    expect(calcAge(dobYearsAgo(30))).toBe(30)
  })

  it('calcula correctamente 25 años', () => {
    expect(calcAge(dobYearsAgo(25))).toBe(25)
  })

  it('retorna N-1 si el cumpleaños aún no ocurrió este año', () => {
    // Fecha de nacimiento hace exactamente N años pero el mes es el siguiente
    const nextMonth = dobYearsAgo(30, 1) // cumpleaños en el mes siguiente → aún no cumplió
    // Solo aplica si el mes actual + 1 no excede diciembre
    const age = calcAge(nextMonth)
    expect(age).toBe(29)
  })

  it('acepta string ISO como input', () => {
    const isoDate = dobYearsAgo(20).toISOString()
    expect(calcAge(isoDate)).toBe(20)
  })

  it('acepta objeto Date como input', () => {
    expect(calcAge(dobYearsAgo(18))).toBe(18)
  })

  it('retorna edad ≥ 0', () => {
    expect(calcAge(new Date())).toBeGreaterThanOrEqual(0)
  })
})
