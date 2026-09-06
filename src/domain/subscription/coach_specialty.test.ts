import { describe, it, expect } from 'vitest'

// Funciones puras de filtrado de especialidades (misma lógica que CoachSidebarClient)
// specialties: string[] — fuente canónica. [] = acceso completo (backward compat).
const hasGym       = (sp: string[]) => sp.includes('GYM')       || sp.length === 0
const hasNutrition = (sp: string[]) => sp.includes('NUTRITION')  || sp.length === 0
const hasRunning   = (sp: string[]) => sp.includes('RUNNING')    || sp.length === 0

describe('Coach specialties[] — visibilidad de herramientas en panel', () => {
  describe('[] vacío — acceso completo (backward compat)', () => {
    it('muestra gym',       () => expect(hasGym([])).toBe(true))
    it('muestra nutrition', () => expect(hasNutrition([])).toBe(true))
    it('muestra running',   () => expect(hasRunning([])).toBe(true))
  })

  describe('["RUNNING"] — solo plan de carrera', () => {
    it('oculta gym',       () => expect(hasGym(['RUNNING'])).toBe(false))
    it('oculta nutrition', () => expect(hasNutrition(['RUNNING'])).toBe(false))
    it('muestra running',  () => expect(hasRunning(['RUNNING'])).toBe(true))
  })

  describe('["GYM"] — solo rutinas de fuerza', () => {
    it('muestra gym',      () => expect(hasGym(['GYM'])).toBe(true))
    it('oculta nutrition', () => expect(hasNutrition(['GYM'])).toBe(false))
    it('oculta running',   () => expect(hasRunning(['GYM'])).toBe(false))
  })

  describe('["NUTRITION"] — solo plantillas nutricionales', () => {
    it('oculta gym',        () => expect(hasGym(['NUTRITION'])).toBe(false))
    it('muestra nutrition',  () => expect(hasNutrition(['NUTRITION'])).toBe(true))
    it('oculta running',     () => expect(hasRunning(['NUTRITION'])).toBe(false))
  })

  describe('["RUNNING", "GYM"] — coach integral sin nutrición', () => {
    it('muestra gym',      () => expect(hasGym(['RUNNING', 'GYM'])).toBe(true))
    it('oculta nutrition', () => expect(hasNutrition(['RUNNING', 'GYM'])).toBe(false))
    it('muestra running',  () => expect(hasRunning(['RUNNING', 'GYM'])).toBe(true))
  })

  describe('["RUNNING", "GYM", "NUTRITION"] — acceso completo explícito', () => {
    it('muestra gym',       () => expect(hasGym(['RUNNING', 'GYM', 'NUTRITION'])).toBe(true))
    it('muestra nutrition', () => expect(hasNutrition(['RUNNING', 'GYM', 'NUTRITION'])).toBe(true))
    it('muestra running',   () => expect(hasRunning(['RUNNING', 'GYM', 'NUTRITION'])).toBe(true))
  })

  describe('disciplinas futuras — no afectan las actuales', () => {
    it('["SWIMMING"] oculta gym',       () => expect(hasGym(['SWIMMING'])).toBe(false))
    it('["CYCLING"] oculta nutrition',   () => expect(hasNutrition(['CYCLING'])).toBe(false))
    it('["YOGA"] oculta running',        () => expect(hasRunning(['YOGA'])).toBe(false))
    it('["SWIMMING", "GYM"] muestra gym', () => expect(hasGym(['SWIMMING', 'GYM'])).toBe(true))
  })
})
