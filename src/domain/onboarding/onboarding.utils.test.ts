/**
 * E2E agent: Onboarding utils — mapeo goalType → sportConfig
 *
 * resolveSportConfig es el bridge entre el plan generado y el perfil del atleta.
 * Se llama en generatePlanUseCase (Phase 3) para escribir sportType + sportGoal
 * en completeOnboarding. Si el mapeo es incorrecto, el atleta queda con sportGoal
 * equivocado que afecta /progress, /plan y las vistas del coach.
 *
 * timeStringToSecs convierte tiempo de carrera en segundos para predictRaceTime.
 * Si falla, la predicción de tiempo de carrera devuelve null.
 *
 * Flujo cubierto:
 *   - onboarding/new-goal → generatePlanUseCase → resolveSportConfig → completeOnboarding
 *   - /coach/athlete/[id]/plan → POST con targetTime → timeStringToSecs → predictRaceTime
 *
 * Cómo correr:
 *   pnpm test src/domain/onboarding/onboarding.utils.test.ts
 */
import { describe, it, expect } from 'vitest'
import { resolveSportConfig, timeStringToSecs } from './onboarding.utils'

// ── resolveSportConfig ────────────────────────────────────────────────────────

describe('resolveSportConfig — RUNNING goals', () => {
  it('RACE_5K → RUNNING + RACE', () => {
    expect(resolveSportConfig('RACE_5K')).toEqual({ sportType: 'RUNNING', sportGoal: 'RACE' })
  })

  it('RACE_10K → RUNNING + RACE', () => {
    expect(resolveSportConfig('RACE_10K')).toEqual({ sportType: 'RUNNING', sportGoal: 'RACE' })
  })

  it('RACE_HALF_MARATHON → RUNNING + RACE', () => {
    expect(resolveSportConfig('RACE_HALF_MARATHON')).toEqual({ sportType: 'RUNNING', sportGoal: 'RACE' })
  })

  it('RACE_MARATHON → RUNNING + RACE', () => {
    expect(resolveSportConfig('RACE_MARATHON')).toEqual({ sportType: 'RUNNING', sportGoal: 'RACE' })
  })

  it('cualquier goalType que empiece con RACE_ → RUNNING + RACE', () => {
    expect(resolveSportConfig('RACE_ULTRA_50K')).toEqual({ sportType: 'RUNNING', sportGoal: 'RACE' })
  })
})

describe('resolveSportConfig — STRENGTH goals', () => {
  it('STRENGTH_TRAINING → STRENGTH + BODY_RECOMPOSITION', () => {
    expect(resolveSportConfig('STRENGTH_TRAINING')).toEqual({ sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' })
  })

  it('BODY_RECOMPOSITION → STRENGTH + BODY_RECOMPOSITION', () => {
    expect(resolveSportConfig('BODY_RECOMPOSITION')).toEqual({ sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' })
  })

  it('WEIGHT_LOSS → STRENGTH + BODY_RECOMPOSITION', () => {
    expect(resolveSportConfig('WEIGHT_LOSS')).toEqual({ sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' })
  })
})

describe('resolveSportConfig — fallback GENERAL', () => {
  it('goalType desconocido → GENERAL + GENERAL_FITNESS', () => {
    expect(resolveSportConfig('CYCLING')).toEqual({ sportType: 'GENERAL', sportGoal: 'GENERAL_FITNESS' })
    expect(resolveSportConfig('TRIATHLON')).toEqual({ sportType: 'GENERAL', sportGoal: 'GENERAL_FITNESS' })
    expect(resolveSportConfig('')).toEqual({ sportType: 'GENERAL', sportGoal: 'GENERAL_FITNESS' })
    expect(resolveSportConfig('SOMETHING_ELSE')).toEqual({ sportType: 'GENERAL', sportGoal: 'GENERAL_FITNESS' })
  })

  it('GENERAL_FITNESS → fallback GENERAL (no está en mapeos explícitos)', () => {
    // GENERAL_FITNESS mapea a BODY_RECOMPOSITION_16W en templates pero en sportConfig es GENERAL
    expect(resolveSportConfig('GENERAL_FITNESS')).toEqual({ sportType: 'GENERAL', sportGoal: 'GENERAL_FITNESS' })
  })
})

describe('resolveSportConfig — case normalization', () => {
  it('es case-insensitive (normaliza a UPPER antes de comparar)', () => {
    expect(resolveSportConfig('race_5k')).toEqual({ sportType: 'RUNNING', sportGoal: 'RACE' })
    expect(resolveSportConfig('Race_5K')).toEqual({ sportType: 'RUNNING', sportGoal: 'RACE' })
    expect(resolveSportConfig('strength_training')).toEqual({ sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' })
    expect(resolveSportConfig('body_recomposition')).toEqual({ sportType: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION' })
  })
})

describe('resolveSportConfig — valores del return son strings válidos', () => {
  const allGoalTypes = [
    'RACE_5K', 'RACE_10K', 'RACE_HALF_MARATHON', 'RACE_MARATHON',
    'STRENGTH_TRAINING', 'BODY_RECOMPOSITION', 'WEIGHT_LOSS',
    'GENERAL_FITNESS', 'UNKNOWN',
  ]

  it('sportType siempre es RUNNING | STRENGTH | GENERAL', () => {
    const validSportTypes = new Set(['RUNNING', 'STRENGTH', 'GENERAL'])
    allGoalTypes.forEach((gt) => {
      const { sportType } = resolveSportConfig(gt)
      expect(validSportTypes.has(sportType), `sportType "${sportType}" para ${gt} no es válido`).toBe(true)
    })
  })

  it('sportGoal siempre es RACE | BODY_RECOMPOSITION | GENERAL_FITNESS', () => {
    const validSportGoals = new Set(['RACE', 'BODY_RECOMPOSITION', 'GENERAL_FITNESS'])
    allGoalTypes.forEach((gt) => {
      const { sportGoal } = resolveSportConfig(gt)
      expect(validSportGoals.has(sportGoal), `sportGoal "${sportGoal}" para ${gt} no es válido`).toBe(true)
    })
  })
})

// ── timeStringToSecs ──────────────────────────────────────────────────────────

describe('timeStringToSecs — formato MM:SS', () => {
  it('5:30 → 330 segundos', () => {
    expect(timeStringToSecs('5:30')).toBe(330)
  })

  it('25:00 → 1500 segundos', () => {
    expect(timeStringToSecs('25:00')).toBe(1500)
  })

  it('50:00 → 3000 segundos', () => {
    expect(timeStringToSecs('50:00')).toBe(3000)
  })

  it('0:59 → 59 segundos', () => {
    expect(timeStringToSecs('0:59')).toBe(59)
  })
})

describe('timeStringToSecs — formato HH:MM:SS', () => {
  it('1:20:00 → 4800 segundos (media maratón 1h20)', () => {
    expect(timeStringToSecs('1:20:00')).toBe(4800)
  })

  it('2:00:00 → 7200 segundos', () => {
    expect(timeStringToSecs('2:00:00')).toBe(7200)
  })

  it('0:45:30 → 2730 segundos', () => {
    expect(timeStringToSecs('0:45:30')).toBe(2730)
  })

  it('3:30:00 → 12600 segundos (maratón)', () => {
    expect(timeStringToSecs('3:30:00')).toBe(12600)
  })
})

describe('timeStringToSecs — inputs inválidos → null', () => {
  it('null → null', () => {
    expect(timeStringToSecs(null)).toBeNull()
  })

  it('undefined → null', () => {
    expect(timeStringToSecs(undefined)).toBeNull()
  })

  it('string vacío → null', () => {
    expect(timeStringToSecs('')).toBeNull()
  })

  it('string sin ":" → null', () => {
    expect(timeStringToSecs('3000')).toBeNull()
  })

  it('string con letras → null', () => {
    expect(timeStringToSecs('1h20m')).toBeNull()
    expect(timeStringToSecs('abc')).toBeNull()
  })

  it('demasiados segmentos → null', () => {
    expect(timeStringToSecs('1:2:3:4')).toBeNull()
  })

  it('NaN en algún segmento → null', () => {
    expect(timeStringToSecs('1:xx:00')).toBeNull()
    expect(timeStringToSecs('ab:30')).toBeNull()
  })
})

describe('timeStringToSecs — consistencia con predictRaceTime', () => {
  it('valor convertido es siempre positivo', () => {
    const validInputs = ['5:00', '25:30', '1:10:00', '2:59:59']
    validInputs.forEach((t) => {
      const secs = timeStringToSecs(t)
      expect(secs).not.toBeNull()
      expect(secs!).toBeGreaterThan(0)
    })
  })

  it('tiempo más largo produce más segundos (monotónico)', () => {
    const t5k  = timeStringToSecs('25:00')!  // 25 min
    const t10k = timeStringToSecs('50:00')!  // 50 min
    const thm  = timeStringToSecs('1:45:00')! // 1h45
    expect(t10k).toBeGreaterThan(t5k)
    expect(thm).toBeGreaterThan(t10k)
  })
})
