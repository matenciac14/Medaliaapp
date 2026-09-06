import { describe, it, expect } from 'vitest'
import { intensityToDayType } from './day_type'

describe('intensityToDayType', () => {
  it('HIGH → hard', () => expect(intensityToDayType('HIGH')).toBe('hard'))
  it('LOW  → low',  () => expect(intensityToDayType('LOW')).toBe('low'))
  it('REST → rest', () => expect(intensityToDayType('REST')).toBe('rest'))
  it('MODERATE → easy', () => expect(intensityToDayType('MODERATE')).toBe('easy'))
  it('null → easy (fallback)', () => expect(intensityToDayType(null)).toBe('easy'))
  it('undefined → easy (fallback)', () => expect(intensityToDayType(undefined)).toBe('easy'))
  it('valor desconocido → easy (fallback)', () => expect(intensityToDayType('UNKNOWN')).toBe('easy'))
})
