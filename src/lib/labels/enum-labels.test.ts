import { describe, it, expect } from 'vitest'
import { GOAL_LABEL, SPORT_LABEL, ROLE_LABEL, label } from './enum-labels'

describe('GOAL_LABEL', () => {
  it('mapea RACE_5K a "5K"', () => expect(GOAL_LABEL.RACE_5K).toBe('5K'))
  it('mapea RACE_10K a "10K"', () => expect(GOAL_LABEL.RACE_10K).toBe('10K'))
  it('mapea RACE_HALF_MARATHON a "Media maratón"', () => expect(GOAL_LABEL.RACE_HALF_MARATHON).toBe('Media maratón'))
  it('mapea RACE_MARATHON a "Maratón"', () => expect(GOAL_LABEL.RACE_MARATHON).toBe('Maratón'))
  it('mapea BODY_RECOMPOSITION', () => expect(GOAL_LABEL.BODY_RECOMPOSITION).toBe('Recomposición corporal'))
  it('mapea STRENGTH_TRAINING a "Fuerza"', () => expect(GOAL_LABEL.STRENGTH_TRAINING).toBe('Fuerza'))
})

describe('SPORT_LABEL', () => {
  it('mapea RUNNING', () => expect(SPORT_LABEL.RUNNING).toBe('Running'))
  it('mapea STRENGTH', () => expect(SPORT_LABEL.STRENGTH).toBe('Fuerza'))
})

describe('ROLE_LABEL', () => {
  it('mapea ATHLETE', () => expect(ROLE_LABEL.ATHLETE).toBe('Atleta'))
  it('mapea COACH', () => expect(ROLE_LABEL.COACH).toBe('Coach'))
  it('mapea ADMIN', () => expect(ROLE_LABEL.ADMIN).toBe('Admin'))
})

describe('label()', () => {
  it('devuelve el label mapeado', () => expect(label(GOAL_LABEL, 'RACE_10K')).toBe('10K'))
  it('devuelve el valor raw si no está mapeado', () => expect(label(GOAL_LABEL, 'OTRO_ENUM')).toBe('OTRO_ENUM'))
  it('devuelve "—" para null', () => expect(label(GOAL_LABEL, null)).toBe('—'))
  it('devuelve "—" para undefined', () => expect(label(GOAL_LABEL, undefined)).toBe('—'))
})
