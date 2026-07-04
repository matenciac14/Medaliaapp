import { describe, it, expect } from 'vitest'

// Funciones puras de filtrado de especialidad (misma lógica que CoachSidebarClient)
type CoachSpecialty = 'RUNNING' | 'GYM' | 'NUTRITION' | 'ALL'
const showGym       = (sp: CoachSpecialty) => sp === 'GYM'       || sp === 'ALL'
const showNutrition = (sp: CoachSpecialty) => sp === 'NUTRITION'  || sp === 'ALL'

describe('CoachSpecialty — visibilidad de herramientas en panel', () => {
  describe('ALL — acceso completo', () => {
    it('muestra gym', ()       => expect(showGym('ALL')).toBe(true))
    it('muestra nutrition', () => expect(showNutrition('ALL')).toBe(true))
  })

  describe('RUNNING — solo plan de carrera', () => {
    it('oculta gym',       () => expect(showGym('RUNNING')).toBe(false))
    it('oculta nutrition', () => expect(showNutrition('RUNNING')).toBe(false))
  })

  describe('GYM — solo rutinas de fuerza', () => {
    it('muestra gym',      () => expect(showGym('GYM')).toBe(true))
    it('oculta nutrition', () => expect(showNutrition('GYM')).toBe(false))
  })

  describe('NUTRITION — solo plantillas nutricionales', () => {
    it('oculta gym',          () => expect(showGym('NUTRITION')).toBe(false))
    it('muestra nutrition',   () => expect(showNutrition('NUTRITION')).toBe(true))
  })
})
