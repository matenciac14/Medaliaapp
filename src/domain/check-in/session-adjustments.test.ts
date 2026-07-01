/**
 * E2E agent: Check-in → session adjustments
 *
 * buildSessionAdjustments traduce los triggers del check-in en flags
 * que process-check-in.use-case usa para modificar las sesiones de la
 * próxima semana. Es el bridge entre "el atleta reportó X" y "qué cambios
 * se aplican al plan".
 *
 * Flujo cubierto:
 *   POST /api/checkin → evaluateCheckInRules → triggers[]
 *   → buildSessionAdjustments → applySessionAdjustments
 *   → planRepo.updateSession (zona baja, duración reduce, tipo cambia)
 *
 * Invariante crítica del E2E:
 *   - dolor_activo → HIGH_INTENSITY sessions se convierten a RODAJE_Z2
 *   - estres_alto → volumeReduction = 0.85 (no 0.80)
 *   - combinación de triggers no rompe el struct
 *
 * Cómo correr:
 *   pnpm test src/domain/check-in/session-adjustments.test.ts
 */
import { describe, it, expect } from 'vitest'
import { buildSessionAdjustments } from './evaluate-rules'

// ── Sin triggers ──────────────────────────────────────────────────────────────

describe('buildSessionAdjustments — sin triggers', () => {
  it('lista vacía → todos los flags false', () => {
    const result = buildSessionAdjustments([])
    expect(result.hasPain).toBe(false)
    expect(result.hasVolumeTrigger).toBe(false)
    expect(result.hasRpe).toBe(false)
  })

  it('lista vacía → volumeReduction = 0.80 (valor por defecto)', () => {
    expect(buildSessionAdjustments([]).volumeReduction).toBe(0.8)
  })

  it('trigger desconocido → todos false', () => {
    const result = buildSessionAdjustments(['trigger_inexistente'])
    expect(result.hasPain).toBe(false)
    expect(result.hasVolumeTrigger).toBe(false)
    expect(result.hasRpe).toBe(false)
  })
})

// ── dolor_activo ──────────────────────────────────────────────────────────────

describe('buildSessionAdjustments — dolor_activo', () => {
  it('dolor_activo → hasPain = true', () => {
    expect(buildSessionAdjustments(['dolor_activo']).hasPain).toBe(true)
  })

  it('dolor_activo solo → hasVolumeTrigger false, hasRpe false', () => {
    const result = buildSessionAdjustments(['dolor_activo'])
    expect(result.hasVolumeTrigger).toBe(false)
    expect(result.hasRpe).toBe(false)
  })

  it('dolor sin estres → volumeReduction 0.80', () => {
    expect(buildSessionAdjustments(['dolor_activo']).volumeReduction).toBe(0.8)
  })
})

// ── volumeTriggers ────────────────────────────────────────────────────────────

describe('buildSessionAdjustments — triggers de volumen', () => {
  const volumeTriggers = ['energia_baja', 'sueno_bajo', 'fc_alta', 'estres_alto']

  volumeTriggers.forEach((trigger) => {
    it(`${trigger} → hasVolumeTrigger = true`, () => {
      expect(buildSessionAdjustments([trigger]).hasVolumeTrigger).toBe(true)
    })
  })

  it('volumeTriggers no activan hasPain', () => {
    volumeTriggers.forEach((trigger) => {
      expect(buildSessionAdjustments([trigger]).hasPain).toBe(false)
    })
  })

  it('volumeTriggers no activan hasRpe', () => {
    volumeTriggers.forEach((trigger) => {
      expect(buildSessionAdjustments([trigger]).hasRpe).toBe(false)
    })
  })
})

// ── volumeReduction — estres vs otros ────────────────────────────────────────

describe('buildSessionAdjustments — volumeReduction', () => {
  it('estres_alto → volumeReduction = 0.85 (reducción especial 15%)', () => {
    expect(buildSessionAdjustments(['estres_alto']).volumeReduction).toBe(0.85)
  })

  it('energia_baja → volumeReduction = 0.80 (reducción estándar 20%)', () => {
    expect(buildSessionAdjustments(['energia_baja']).volumeReduction).toBe(0.8)
  })

  it('sueno_bajo → volumeReduction = 0.80', () => {
    expect(buildSessionAdjustments(['sueno_bajo']).volumeReduction).toBe(0.8)
  })

  it('fc_alta → volumeReduction = 0.80', () => {
    expect(buildSessionAdjustments(['fc_alta']).volumeReduction).toBe(0.8)
  })

  it('estres_alto + otros → volumeReduction sigue siendo 0.85', () => {
    expect(buildSessionAdjustments(['estres_alto', 'energia_baja']).volumeReduction).toBe(0.85)
    expect(buildSessionAdjustments(['estres_alto', 'sueno_bajo', 'fc_alta']).volumeReduction).toBe(0.85)
  })

  it('dolor_activo + estres_alto → volumeReduction 0.85', () => {
    expect(buildSessionAdjustments(['dolor_activo', 'estres_alto']).volumeReduction).toBe(0.85)
  })
})

// ── rpe_excesivo ──────────────────────────────────────────────────────────────

describe('buildSessionAdjustments — rpe_excesivo', () => {
  it('rpe_excesivo → hasRpe = true', () => {
    expect(buildSessionAdjustments(['rpe_excesivo']).hasRpe).toBe(true)
  })

  it('rpe_excesivo solo → hasPain false, hasVolumeTrigger false', () => {
    const result = buildSessionAdjustments(['rpe_excesivo'])
    expect(result.hasPain).toBe(false)
    expect(result.hasVolumeTrigger).toBe(false)
  })

  it('rpe_excesivo + dolor → ambos activos', () => {
    const result = buildSessionAdjustments(['rpe_excesivo', 'dolor_activo'])
    expect(result.hasRpe).toBe(true)
    expect(result.hasPain).toBe(true)
  })
})

// ── Combinaciones completas ───────────────────────────────────────────────────

describe('buildSessionAdjustments — combinaciones', () => {
  it('todos los triggers → todos los flags activos', () => {
    const all = ['dolor_activo', 'energia_baja', 'sueno_bajo', 'fc_alta', 'estres_alto', 'rpe_excesivo']
    const result = buildSessionAdjustments(all)
    expect(result.hasPain).toBe(true)
    expect(result.hasVolumeTrigger).toBe(true)
    expect(result.hasRpe).toBe(true)
    expect(result.volumeReduction).toBe(0.85) // estres_alto presente
  })

  it('motivacion_baja y nutricion_baja no activan ningún flag de ajuste de sesión', () => {
    // Estos triggers alertan al coach pero NO modifican el plan
    const result = buildSessionAdjustments(['motivacion_baja', 'nutricion_baja'])
    expect(result.hasPain).toBe(false)
    expect(result.hasVolumeTrigger).toBe(false)
    expect(result.hasRpe).toBe(false)
  })

  it('perdida_peso_rapida no activa flags de sesión', () => {
    const result = buildSessionAdjustments(['perdida_peso_rapida'])
    expect(result.hasPain).toBe(false)
    expect(result.hasVolumeTrigger).toBe(false)
    expect(result.hasRpe).toBe(false)
  })
})

// ── Invariantes del struct ────────────────────────────────────────────────────

describe('buildSessionAdjustments — shape del resultado', () => {
  it('siempre retorna las 4 propiedades', () => {
    const result = buildSessionAdjustments([])
    expect(result).toHaveProperty('hasPain')
    expect(result).toHaveProperty('hasVolumeTrigger')
    expect(result).toHaveProperty('hasRpe')
    expect(result).toHaveProperty('volumeReduction')
  })

  it('volumeReduction siempre es un número entre 0 y 1', () => {
    const cases = [
      [],
      ['dolor_activo'],
      ['estres_alto'],
      ['energia_baja', 'sueno_bajo'],
    ]
    cases.forEach((triggers) => {
      const { volumeReduction } = buildSessionAdjustments(triggers)
      expect(typeof volumeReduction).toBe('number')
      expect(volumeReduction).toBeGreaterThan(0)
      expect(volumeReduction).toBeLessThanOrEqual(1)
    })
  })
})
