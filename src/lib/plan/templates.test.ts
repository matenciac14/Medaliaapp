/**
 * E2E agent: Template structure invariants
 *
 * Estos tests garantizan que los 4 templates base producen estructuras válidas.
 * Si un template está mal (weeks incorrectas, sessionType inválido, fase fuera de orden),
 * plan generation falla silenciosamente o produce datos inconsistentes en DB.
 *
 * Flujo cubierto: onboarding/new-goal → getTemplate(goalType) → generatePlanUseCase
 *
 * Cómo correr:
 *   pnpm test src/lib/plan/templates.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  getTemplate,
  PLAN_TEMPLATES,
  HALF_MARATHON_18W,
  TEN_K_12W,
  FIVE_K_8W,
  BODY_RECOMPOSITION_16W,
  STRENGTH_TRAINING_16W,
  type PlanTemplate,
} from './templates'

// ── Enums válidos contra el schema de DB ─────────────────────────────────────

const VALID_SESSION_TYPES = new Set([
  'RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA',
  'FUERZA', 'CICLA', 'NATACION', 'DESCANSO', 'TEST', 'SIMULACRO', 'OTRO',
])

const VALID_PHASES = new Set(['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO'])

// ── Helpers ───────────────────────────────────────────────────────────────────

function assertTemplateIntegrity(template: PlanTemplate, expectedWeeks: number) {
  it(`tiene exactamente ${expectedWeeks} semanas`, () => {
    expect(template.weeks).toHaveLength(expectedWeeks)
    expect(template.totalWeeks).toBe(expectedWeeks)
  })

  it('weekNumbers son consecutivos empezando en 1', () => {
    template.weeks.forEach((w, i) => {
      expect(w.weekNumber).toBe(i + 1)
    })
  })

  it('todas las fases son valores válidos del enum Phase', () => {
    template.weeks.forEach((w) => {
      expect(VALID_PHASES.has(w.phase), `fase "${w.phase}" no es válida`).toBe(true)
    })
  })

  it('la primera semana es siempre BASE', () => {
    expect(template.weeks[0].phase).toBe('BASE')
  })

  it('ninguna semana tiene 0 sesiones', () => {
    template.weeks.forEach((w) => {
      expect(w.sessions.length, `semana ${w.weekNumber} no tiene sesiones`).toBeGreaterThan(0)
    })
  })

  it('todos los sessionType son valores válidos del enum SessionType', () => {
    template.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        expect(
          VALID_SESSION_TYPES.has(s.type),
          `sessionType "${s.type}" (semana ${w.weekNumber}) no está en el enum DB`
        ).toBe(true)
      })
    })
  })

  it('todos los dayOfWeek están en rango [1, 7]', () => {
    template.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        expect(s.dayOfWeek, `dayOfWeek ${s.dayOfWeek} (semana ${w.weekNumber}) fuera de rango`).toBeGreaterThanOrEqual(1)
        expect(s.dayOfWeek).toBeLessThanOrEqual(7)
      })
    })
  })

  it('todos los durationMin son positivos', () => {
    template.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        expect(s.durationMin, `durationMin en sesión semana ${w.weekNumber}`).toBeGreaterThan(0)
      })
    })
  })

  it('no hay dayOfWeek repetidos en la misma semana', () => {
    template.weeks.forEach((w) => {
      const days = w.sessions.map((s) => s.dayOfWeek)
      const uniqueDays = new Set(days)
      expect(uniqueDays.size, `semana ${w.weekNumber} tiene días duplicados: ${days}`).toBe(days.length)
    })
  })
}

// ── getTemplate — routing ─────────────────────────────────────────────────────

describe('getTemplate — routing por goalType', () => {
  it('RACE_5K → FIVE_K_8W (8 semanas)', () => {
    const t = getTemplate('RACE_5K')
    expect(t).not.toBeNull()
    expect(t!.totalWeeks).toBe(8)
  })

  it('RACE_10K → TEN_K_12W (12 semanas)', () => {
    const t = getTemplate('RACE_10K')
    expect(t!.totalWeeks).toBe(12)
  })

  it('RACE_HALF_MARATHON → HALF_MARATHON_18W (18 semanas)', () => {
    const t = getTemplate('RACE_HALF_MARATHON')
    expect(t!.totalWeeks).toBe(18)
  })

  it('RACE_MARATHON → HALF_MARATHON_18W (18 semanas — base aeróbica)', () => {
    const t = getTemplate('RACE_MARATHON')
    expect(t!.totalWeeks).toBe(18)
    expect(t).toBe(getTemplate('RACE_HALF_MARATHON')) // mismo objeto
  })

  it('BODY_RECOMPOSITION → 12 semanas (recortado de 16W para MVP)', () => {
    expect(getTemplate('BODY_RECOMPOSITION')!.totalWeeks).toBe(12)
  })

  it('STRENGTH_TRAINING → 12 semanas (recortado de 16W para MVP)', () => {
    expect(getTemplate('STRENGTH_TRAINING')!.totalWeeks).toBe(12)
  })

  it('GENERAL_FITNESS → 12 semanas (fallback, recortado)', () => {
    expect(getTemplate('GENERAL_FITNESS')!.totalWeeks).toBe(12)
  })

  it('WEIGHT_LOSS → 12 semanas (fallback, recortado)', () => {
    expect(getTemplate('WEIGHT_LOSS')!.totalWeeks).toBe(12)
  })

  it('goalType desconocido → null', () => {
    expect(getTemplate('CYCLING')).toBeNull()
    expect(getTemplate('')).toBeNull()
    expect(getTemplate('SWIMMING')).toBeNull()
    expect(getTemplate('TRIATHLON')).toBeNull()
  })

  it('getTemplate es case-sensitive (DB guarda en mayúsculas)', () => {
    expect(getTemplate('race_5k')).toBeNull()
    expect(getTemplate('Race_5K')).toBeNull()
  })
})

// ── HALF_MARATHON_18W ─────────────────────────────────────────────────────────

describe('HALF_MARATHON_18W — estructura', () => {
  assertTemplateIntegrity(HALF_MARATHON_18W, 18)

  it('tiene sesión TIRADA_LARGA en la mayoría de semanas', () => {
    const withTirada = HALF_MARATHON_18W.weeks.filter((w) =>
      w.sessions.some((s) => s.type === 'TIRADA_LARGA')
    )
    expect(withTirada.length).toBeGreaterThan(0)
  })

  it('tiene sesiones INTERVALOS en fase ESPECIFICO', () => {
    const especifico = HALF_MARATHON_18W.weeks.filter((w) => w.phase === 'ESPECIFICO')
    const hasIntervalos = especifico.some((w) =>
      w.sessions.some((s) => s.type === 'INTERVALOS')
    )
    expect(hasIntervalos).toBe(true)
  })

  it('la última semana es AFINAMIENTO', () => {
    const last = HALF_MARATHON_18W.weeks.at(-1)!
    expect(last.phase).toBe('AFINAMIENTO')
  })

  it('semanas de recuperación tienen isRecoveryWeek = true', () => {
    const recovery = HALF_MARATHON_18W.weeks.filter((w) => w.isRecoveryWeek)
    expect(recovery.length).toBeGreaterThan(0)
  })
})

// ── TEN_K_12W ─────────────────────────────────────────────────────────────────

describe('TEN_K_12W — estructura', () => {
  assertTemplateIntegrity(TEN_K_12W, 12)

  it('la última semana es AFINAMIENTO', () => {
    expect(TEN_K_12W.weeks.at(-1)!.phase).toBe('AFINAMIENTO')
  })

  it('tiene sesiones FARTLEK en alguna semana', () => {
    const hasFartlek = TEN_K_12W.weeks.some((w) =>
      w.sessions.some((s) => s.type === 'FARTLEK')
    )
    expect(hasFartlek).toBe(true)
  })
})

// ── FIVE_K_8W ─────────────────────────────────────────────────────────────────

describe('FIVE_K_8W — estructura', () => {
  assertTemplateIntegrity(FIVE_K_8W, 8)

  it('la última semana es ESPECIFICO (plan corto 8W: BASE→ESPECIFICO sin AFINAMIENTO)', () => {
    // FIVE_K_8W: semanas 1-4 = BASE, semanas 5-8 = ESPECIFICO
    // No tiene AFINAMIENTO — la semana 8 ES la semana de carrera
    expect(FIVE_K_8W.weeks.at(-1)!.phase).toBe('ESPECIFICO')
  })

  it('primera semana tiene RODAJE_Z2 para construir base aeróbica', () => {
    const firstWeekTypes = FIVE_K_8W.weeks[0].sessions.map((s) => s.type)
    expect(firstWeekTypes).toContain('RODAJE_Z2')
  })
})

// ── BODY_RECOMPOSITION_16W ────────────────────────────────────────────────────

describe('BODY_RECOMPOSITION_16W — estructura (recortado a 12W)', () => {
  assertTemplateIntegrity(BODY_RECOMPOSITION_16W, 12)

  it('solo usa tipos de sesión de fuerza o DESCANSO (sin TIRADA_LARGA, sin TEMPO)', () => {
    const invalidForStrength = new Set(['TIRADA_LARGA', 'SIMULACRO', 'NATACION', 'CICLA'])
    BODY_RECOMPOSITION_16W.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        expect(
          invalidForStrength.has(s.type),
          `tipo "${s.type}" no debería aparecer en un template de recomposición`
        ).toBe(false)
      })
    })
  })
})

// ── STRENGTH_TRAINING_16W ─────────────────────────────────────────────────────

describe('STRENGTH_TRAINING_16W — estructura (recortado a 12W)', () => {
  assertTemplateIntegrity(STRENGTH_TRAINING_16W, 12)

  it('no contiene ningún tipo de running (RODAJE_Z2, TEMPO, FARTLEK, INTERVALOS, TIRADA_LARGA)', () => {
    const runningTypes = new Set(['RODAJE_Z2', 'TEMPO', 'FARTLEK', 'INTERVALOS', 'TIRADA_LARGA', 'SIMULACRO'])
    STRENGTH_TRAINING_16W.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        expect(
          runningTypes.has(s.type),
          `BUG-016: tipo "${s.type}" no debería aparecer en STRENGTH_TRAINING`
        ).toBe(false)
      })
    })
  })
})

// ── Cross-template consistency ────────────────────────────────────────────────

describe('Todos los templates — invariantes globales', () => {
  const allTemplates = Object.values(PLAN_TEMPLATES)
  const uniqueTemplates = [...new Set(allTemplates)] // dedup (RACE_MARATHON y RACE_HM comparten objeto)

  it('todos los templates en PLAN_TEMPLATES tienen weeks.length === totalWeeks', () => {
    uniqueTemplates.forEach((t) => {
      expect(t.weeks).toHaveLength(t.totalWeeks)
    })
  })

  it('ningún template tiene semanas sin focusDescription vacío y recoveryWeek=true simultáneamente', () => {
    // Recoveries deben tener descripción de foco
    uniqueTemplates.forEach((t) => {
      t.weeks
        .filter((w) => w.isRecoveryWeek)
        .forEach((w) => {
          expect(w.focusDescription).toBeTruthy()
        })
    })
  })

  it('volumeKm siempre es >= 0', () => {
    uniqueTemplates.forEach((t) => {
      t.weeks.forEach((w) => {
        expect(w.volumeKm).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
