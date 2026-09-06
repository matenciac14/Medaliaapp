import { describe, it, expect } from 'vitest'
import { shouldShowZone } from './zone_utils'

describe('shouldShowZone', () => {
  it('retorna true para sesión de running con zona válida', () => {
    expect(shouldShowZone('RODAJE_Z2', 'Z2')).toBe(true)
  })

  it('retorna false si zoneTarget es null', () => {
    expect(shouldShowZone('RODAJE_Z2', null)).toBe(false)
  })

  it('retorna false si zoneTarget es undefined', () => {
    expect(shouldShowZone('RODAJE_Z2', undefined)).toBe(false)
  })

  it('retorna false si zoneTarget es cadena vacía', () => {
    expect(shouldShowZone('RODAJE_Z2', '')).toBe(false)
  })

  it('retorna false si zoneTarget es "N/A"', () => {
    expect(shouldShowZone('TEMPO', 'N/A')).toBe(false)
  })

  it('retorna false si zoneTarget es "—"', () => {
    expect(shouldShowZone('INTERVALOS', '—')).toBe(false)
  })

  it('retorna false para sesiones FUERZA aunque tenga zona', () => {
    expect(shouldShowZone('FUERZA', 'Z3')).toBe(false)
  })

  it('retorna false para FUERZA con N/A', () => {
    expect(shouldShowZone('FUERZA', 'N/A')).toBe(false)
  })

  it('retorna true para TIRADA_LARGA con zona Z2', () => {
    expect(shouldShowZone('TIRADA_LARGA', 'Z2')).toBe(true)
  })

  it('retorna false si sessionType es null', () => {
    // sesión sin tipo — no mostrar zona
    expect(shouldShowZone(null, 'Z2')).toBe(true) // zona válida sin restricción de tipo
  })
})
