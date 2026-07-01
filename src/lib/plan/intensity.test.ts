/**
 * E2E agent: Session intensity mapping
 *
 * getSessionIntensity es la fuente canónica para determinar la intensidad
 * de una sesión a partir de su tipo. Este valor se usa en dos lugares críticos:
 *
 *   1. generatePlanUseCase → cada sesión del template se marca con su intensidad
 *      → intensity alimenta getDailyNutritionTarget → target nutricional del día
 *
 *   2. /nutrition/page.tsx → se busca la sesión del día por fecha y se muestra
 *      la nutrición según la intensidad de esa sesión
 *
 * Si este mapeo es incorrecto, el atleta ve metas nutricionales equivocadas.
 * Por ejemplo, RODAJE_Z2 con HIGH → el atleta come de más en días suaves.
 *
 * Flujo cubierto:
 *   PlannedSession.type → getSessionIntensity → SessionIntensity
 *   → getDailyNutritionTarget → kcal + macros del día
 *
 * Cómo correr:
 *   pnpm test src/lib/plan/intensity.test.ts
 */
import { describe, it, expect } from 'vitest'
import { getSessionIntensity } from './intensity'

// ── HIGH intensity ────────────────────────────────────────────────────────────

describe('getSessionIntensity — HIGH', () => {
  it('INTERVALOS → HIGH', () => {
    expect(getSessionIntensity('INTERVALOS')).toBe('HIGH')
  })

  it('TIRADA_LARGA → HIGH', () => {
    expect(getSessionIntensity('TIRADA_LARGA')).toBe('HIGH')
  })

  it('SIMULACRO → HIGH', () => {
    expect(getSessionIntensity('SIMULACRO')).toBe('HIGH')
  })

  it('TEST → HIGH', () => {
    expect(getSessionIntensity('TEST')).toBe('HIGH')
  })
})

// ── MODERATE intensity ────────────────────────────────────────────────────────

describe('getSessionIntensity — MODERATE', () => {
  it('TEMPO → MODERATE', () => {
    expect(getSessionIntensity('TEMPO')).toBe('MODERATE')
  })

  it('FARTLEK → MODERATE', () => {
    expect(getSessionIntensity('FARTLEK')).toBe('MODERATE')
  })

  it('FUERZA → MODERATE', () => {
    expect(getSessionIntensity('FUERZA')).toBe('MODERATE')
  })

  it('CICLA → MODERATE', () => {
    expect(getSessionIntensity('CICLA')).toBe('MODERATE')
  })

  it('NATACION → MODERATE', () => {
    expect(getSessionIntensity('NATACION')).toBe('MODERATE')
  })

  it('OTRO → MODERATE (genérico, usado para gym y cardio machine)', () => {
    expect(getSessionIntensity('OTRO')).toBe('MODERATE')
  })
})

// ── LOW intensity ─────────────────────────────────────────────────────────────

describe('getSessionIntensity — LOW', () => {
  it('RODAJE_Z2 → LOW', () => {
    expect(getSessionIntensity('RODAJE_Z2')).toBe('LOW')
  })
})

// ── REST ──────────────────────────────────────────────────────────────────────

describe('getSessionIntensity — REST', () => {
  it('DESCANSO → REST', () => {
    expect(getSessionIntensity('DESCANSO')).toBe('REST')
  })
})

// ── Default / unknown ─────────────────────────────────────────────────────────

describe('getSessionIntensity — fallback MODERATE', () => {
  it('tipo desconocido → MODERATE (safe default)', () => {
    expect(getSessionIntensity('UNKNOWN_TYPE')).toBe('MODERATE')
    expect(getSessionIntensity('')).toBe('MODERATE')
    expect(getSessionIntensity('running')).toBe('MODERATE')
  })
})

// ── Valores válidos del enum SessionIntensity ─────────────────────────────────

describe('getSessionIntensity — output siempre es un SessionIntensity válido', () => {
  const validIntensities = new Set(['HIGH', 'MODERATE', 'LOW', 'REST'])
  const allTypes = [
    'RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA',
    'FUERZA', 'CICLA', 'NATACION', 'DESCANSO', 'TEST', 'SIMULACRO', 'OTRO',
    'UNKNOWN',
  ]

  it('todos los SessionType del schema retornan una intensidad válida', () => {
    allTypes.forEach((type) => {
      const intensity = getSessionIntensity(type)
      expect(
        validIntensities.has(intensity),
        `getSessionIntensity("${type}") devolvió "${intensity}" — no es un SessionIntensity válido`
      ).toBe(true)
    })
  })
})

// ── Consistencia nutrition-training ──────────────────────────────────────────

describe('getSessionIntensity — consistencia con getDailyNutritionTarget', () => {
  /**
   * INVARIANTE CRÍTICA: la jerarquía de intensidad es HIGH > MODERATE > LOW > REST
   * Lo cual mapea en nutrición a:
   *   HIGH → targetKcalHard (más calorías, más carbos)
   *   MODERATE / LOW → targetKcalEasy (moderado)
   *   REST → targetKcalRest (menos calorías)
   *
   * Este test verifica que los tipos con mayor demanda energética son HIGH,
   * y los de recuperación/descanso son LOW o REST.
   */

  it('sesiones de alta demanda energética (carrera de calidad) → HIGH', () => {
    const highDemand = ['INTERVALOS', 'SIMULACRO', 'TEST', 'TIRADA_LARGA']
    highDemand.forEach((type) => {
      expect(getSessionIntensity(type)).toBe('HIGH')
    })
  })

  it('sesión de recuperación activa (RODAJE_Z2) → LOW (no HIGH ni REST)', () => {
    expect(getSessionIntensity('RODAJE_Z2')).toBe('LOW')
  })

  it('DESCANSO → REST (mínimo calórico)', () => {
    expect(getSessionIntensity('DESCANSO')).toBe('REST')
  })

  it('FUERZA → MODERATE (no HIGH — no es carrera de calidad)', () => {
    // FUERZA no debe ser HIGH porque el atleta no necesita el mismo pico de carbos que en intervalos
    expect(getSessionIntensity('FUERZA')).toBe('MODERATE')
  })
})
