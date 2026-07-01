import { describe, it, expect } from 'vitest'
import { evaluateCheckInRules, buildSessionAdjustments } from './evaluate-rules'
import type { CheckInInput } from './check-in.types'
import type { CheckInContext } from './evaluate-rules'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Atleta saludable — sin triggers */
function okCheckIn(overrides: Partial<CheckInInput> = {}): CheckInInput {
  return { rpe: 6, sleepHours: 8, energyLevel: 7, stressLevel: 4, ...overrides }
}

function baseCtx(overrides: Partial<CheckInContext> = {}): CheckInContext {
  return { phase: 'BASE', currentWeek: 3, totalWeeks: 18, hrRestingBaseline: 60, ...overrides }
}

// ---------------------------------------------------------------------------
// Estado limpio
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — sin triggers', () => {
  it('atleta saludable → severity ok, sin triggers', () => {
    const r = evaluateCheckInRules(okCheckIn(), baseCtx())
    expect(r.severity).toBe('ok')
    expect(r.triggers).toHaveLength(0)
    expect(r.adjustments).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// FC reposo alta
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — fc_alta', () => {
  it('FC > baseline * 1.1 → trigger fc_alta + warning', () => {
    const r = evaluateCheckInRules(okCheckIn({ heartRate: 67 }), baseCtx({ hrRestingBaseline: 60 }))
    expect(r.triggers).toContain('fc_alta')
    expect(r.severity).toBe('warning')
  })

  it('FC exactamente en el umbral (= baseline * 1.1) → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ heartRate: 66 }), baseCtx({ hrRestingBaseline: 60 }))
    // 60 * 1.1 = 66 → NOT > 66 → no trigger
    expect(r.triggers).not.toContain('fc_alta')
  })

  it('sin FC reportada → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ heartRate: undefined }), baseCtx())
    expect(r.triggers).not.toContain('fc_alta')
  })

  it('usa 62 como baseline cuando hrRestingBaseline es undefined', () => {
    // 62 * 1.1 = 68.2 → FC 70 debe disparar
    const r = evaluateCheckInRules(okCheckIn({ heartRate: 70 }), baseCtx({ hrRestingBaseline: undefined }))
    expect(r.triggers).toContain('fc_alta')
  })
})

// ---------------------------------------------------------------------------
// Sueño insuficiente
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — sueno_bajo', () => {
  it('sleepHours < 6.5 → trigger sueno_bajo', () => {
    const r = evaluateCheckInRules(okCheckIn({ sleepHours: 6 }), baseCtx())
    expect(r.triggers).toContain('sueno_bajo')
    expect(r.severity).toBe('warning')
  })

  it('sleepHours exactamente 6.5 → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ sleepHours: 6.5 }), baseCtx())
    expect(r.triggers).not.toContain('sueno_bajo')
  })

  it('sleepHours = 8 → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ sleepHours: 8 }), baseCtx())
    expect(r.triggers).not.toContain('sueno_bajo')
  })
})

// ---------------------------------------------------------------------------
// RPE excesivo — solo activo en fase BASE
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — rpe_excesivo', () => {
  it('rpe >= 8 en fase BASE → trigger rpe_excesivo', () => {
    const r = evaluateCheckInRules(okCheckIn({ rpe: 8 }), baseCtx({ phase: 'BASE' }))
    expect(r.triggers).toContain('rpe_excesivo')
  })

  it('rpe = 7 en fase BASE → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ rpe: 7 }), baseCtx({ phase: 'BASE' }))
    expect(r.triggers).not.toContain('rpe_excesivo')
  })

  it('rpe = 9 en fase DESARROLLO → sin trigger (solo dispara en BASE)', () => {
    const r = evaluateCheckInRules(okCheckIn({ rpe: 9 }), baseCtx({ phase: 'DESARROLLO' }))
    expect(r.triggers).not.toContain('rpe_excesivo')
  })

  it('rpe = 10 en fase AFINAMIENTO → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ rpe: 10 }), baseCtx({ phase: 'AFINAMIENTO' }))
    expect(r.triggers).not.toContain('rpe_excesivo')
  })
})

// ---------------------------------------------------------------------------
// Dolor / lesión — severity CRITICAL
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — dolor_activo', () => {
  it('painLevel >= 5 → trigger dolor_activo + severity critical', () => {
    const r = evaluateCheckInRules(okCheckIn({ painLevel: 5 }), baseCtx())
    expect(r.triggers).toContain('dolor_activo')
    expect(r.severity).toBe('critical')
  })

  it('painLevel = 10 → critical', () => {
    const r = evaluateCheckInRules(okCheckIn({ painLevel: 10 }), baseCtx())
    expect(r.severity).toBe('critical')
  })

  it('painLevel = 4 → sin trigger dolor_activo', () => {
    const r = evaluateCheckInRules(okCheckIn({ painLevel: 4 }), baseCtx())
    expect(r.triggers).not.toContain('dolor_activo')
  })

  it('sin painLevel → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn(), baseCtx())
    expect(r.triggers).not.toContain('dolor_activo')
  })

  it('dolor_activo anula warning — severity siempre critical', () => {
    // dolor + sueño bajo: critical debe ganar
    const r = evaluateCheckInRules(okCheckIn({ painLevel: 7, sleepHours: 5 }), baseCtx())
    expect(r.severity).toBe('critical')
    expect(r.triggers).toContain('dolor_activo')
    expect(r.triggers).toContain('sueno_bajo')
  })
})

// ---------------------------------------------------------------------------
// Energía baja
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — energia_baja', () => {
  it('energyLevel <= 3 → trigger energia_baja', () => {
    const r = evaluateCheckInRules(okCheckIn({ energyLevel: 3 }), baseCtx())
    expect(r.triggers).toContain('energia_baja')
    expect(r.severity).toBe('warning')
  })

  it('energyLevel = 1 (mínimo) → trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ energyLevel: 1 }), baseCtx())
    expect(r.triggers).toContain('energia_baja')
  })

  it('energyLevel = 4 → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ energyLevel: 4 }), baseCtx())
    expect(r.triggers).not.toContain('energia_baja')
  })
})

// ---------------------------------------------------------------------------
// Estrés alto
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — estres_alto', () => {
  it('stressLevel >= 8 → trigger estres_alto', () => {
    const r = evaluateCheckInRules(okCheckIn({ stressLevel: 8 }), baseCtx())
    expect(r.triggers).toContain('estres_alto')
    expect(r.severity).toBe('warning')
  })

  it('stressLevel = 7 → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ stressLevel: 7 }), baseCtx())
    expect(r.triggers).not.toContain('estres_alto')
  })
})

// ---------------------------------------------------------------------------
// Motivación baja
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — motivacion_baja', () => {
  it('motivation <= 3 → trigger motivacion_baja', () => {
    const r = evaluateCheckInRules(okCheckIn({ motivation: 3 }), baseCtx())
    expect(r.triggers).toContain('motivacion_baja')
  })

  it('motivation = 4 → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ motivation: 4 }), baseCtx())
    expect(r.triggers).not.toContain('motivacion_baja')
  })

  it('motivation no enviada → sin trigger (campo opcional)', () => {
    const r = evaluateCheckInRules(okCheckIn({ motivation: undefined }), baseCtx())
    expect(r.triggers).not.toContain('motivacion_baja')
  })
})

// ---------------------------------------------------------------------------
// Adherencia nutricional baja
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — nutricion_baja', () => {
  it('nutritionAdherence < 4 → trigger nutricion_baja', () => {
    const r = evaluateCheckInRules(okCheckIn({ nutritionAdherence: 3 }), baseCtx())
    expect(r.triggers).toContain('nutricion_baja')
  })

  it('nutritionAdherence = 4 → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ nutritionAdherence: 4 }), baseCtx())
    expect(r.triggers).not.toContain('nutricion_baja')
  })

  it('nutritionAdherence no enviada → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn(), baseCtx())
    expect(r.triggers).not.toContain('nutricion_baja')
  })
})

// ---------------------------------------------------------------------------
// Pérdida de peso rápida
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — perdida_peso_rapida', () => {
  it('pérdida > 1 kg respecto a semana anterior → trigger', () => {
    const r = evaluateCheckInRules(
      okCheckIn({ weight: 74 }),
      baseCtx({ previousWeight: 75.5 })
    )
    expect(r.triggers).toContain('perdida_peso_rapida')
  })

  it('pérdida exactamente 1 kg → sin trigger (debe ser MAYOR que 1)', () => {
    const r = evaluateCheckInRules(
      okCheckIn({ weight: 74 }),
      baseCtx({ previousWeight: 75 })
    )
    expect(r.triggers).not.toContain('perdida_peso_rapida')
  })

  it('sin peso actual → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn(), baseCtx({ previousWeight: 75 }))
    expect(r.triggers).not.toContain('perdida_peso_rapida')
  })

  it('sin peso anterior → sin trigger', () => {
    const r = evaluateCheckInRules(okCheckIn({ weight: 74 }), baseCtx({ previousWeight: undefined }))
    expect(r.triggers).not.toContain('perdida_peso_rapida')
  })
})

// ---------------------------------------------------------------------------
// Múltiples triggers — severity correcta
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — múltiples triggers', () => {
  it('varios warnings → severity warning, todos los triggers presentes', () => {
    const r = evaluateCheckInRules(
      okCheckIn({ sleepHours: 5, energyLevel: 2, stressLevel: 9 }),
      baseCtx()
    )
    expect(r.triggers).toContain('sueno_bajo')
    expect(r.triggers).toContain('energia_baja')
    expect(r.triggers).toContain('estres_alto')
    expect(r.severity).toBe('warning')
  })

  it('warning + critical → severity siempre critical', () => {
    const r = evaluateCheckInRules(
      okCheckIn({ sleepHours: 5, painLevel: 8 }),
      baseCtx()
    )
    expect(r.severity).toBe('critical')
  })
})

// ---------------------------------------------------------------------------
// Medidas corporales — puramente observacionales
// ---------------------------------------------------------------------------
describe('evaluateCheckInRules — medidas corporales', () => {
  it('medidas corporales no disparan ningún trigger', () => {
    const r = evaluateCheckInRules(
      okCheckIn({ waistCm: 78, armsCm: 32, hipsCm: 96, thighsCm: 54 }),
      baseCtx()
    )
    expect(r.triggers).toHaveLength(0)
    expect(r.severity).toBe('ok')
  })

  it('medidas corporales con otros campos problemáticos no interfieren con triggers', () => {
    const r = evaluateCheckInRules(
      okCheckIn({ sleepHours: 5, waistCm: 80, armsCm: 33, hipsCm: 98, thighsCm: 56 }),
      baseCtx()
    )
    expect(r.triggers).toContain('sueno_bajo')
    expect(r.triggers).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// buildSessionAdjustments
// ---------------------------------------------------------------------------
describe('buildSessionAdjustments', () => {
  it('sin triggers → todo en false, volumeReduction 0.8', () => {
    const r = buildSessionAdjustments([])
    expect(r.hasPain).toBe(false)
    expect(r.hasVolumeTrigger).toBe(false)
    expect(r.hasRpe).toBe(false)
    expect(r.volumeReduction).toBe(0.8)
  })

  it('dolor_activo → hasPain true', () => {
    expect(buildSessionAdjustments(['dolor_activo']).hasPain).toBe(true)
  })

  it('rpe_excesivo → hasRpe true', () => {
    expect(buildSessionAdjustments(['rpe_excesivo']).hasRpe).toBe(true)
  })

  it('energia_baja → hasVolumeTrigger true', () => {
    expect(buildSessionAdjustments(['energia_baja']).hasVolumeTrigger).toBe(true)
  })

  it('sueno_bajo → hasVolumeTrigger true', () => {
    expect(buildSessionAdjustments(['sueno_bajo']).hasVolumeTrigger).toBe(true)
  })

  it('fc_alta → hasVolumeTrigger true', () => {
    expect(buildSessionAdjustments(['fc_alta']).hasVolumeTrigger).toBe(true)
  })

  it('estres_alto → hasVolumeTrigger true + volumeReduction 0.85', () => {
    const r = buildSessionAdjustments(['estres_alto'])
    expect(r.hasVolumeTrigger).toBe(true)
    expect(r.volumeReduction).toBe(0.85)
  })

  it('estres_alto tiene prioridad de reducción sobre otros triggers (0.85 > 0.8)', () => {
    const r = buildSessionAdjustments(['energia_baja', 'estres_alto', 'rpe_excesivo'])
    expect(r.volumeReduction).toBe(0.85)
  })

  it('sin estres_alto → volumeReduction 0.8 aunque haya otros triggers', () => {
    const r = buildSessionAdjustments(['energia_baja', 'sueno_bajo', 'dolor_activo'])
    expect(r.volumeReduction).toBe(0.8)
  })
})
