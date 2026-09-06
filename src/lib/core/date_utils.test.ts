/**
 * E2E agent: Date utilities
 *
 * Estas funciones son la base de la navegación semanal de ATLETA y COACH.
 * jsToOurDow se usa en getDashboardSummary para encontrar la sesión de hoy.
 * buildWeekDateNumbers se usa en PlanBuilderClient y en el weekly strip del atleta.
 * Un error aquí hace que el atleta vea la sesión incorrecta como "sesión de hoy".
 *
 * Convención DB vs JS:
 *   JS getDay():   0=Dom  1=Lun  2=Mar  3=Mié  4=Jue  5=Vie  6=Sáb
 *   Nuestro schema: 1=Lun  2=Mar  3=Mié  4=Jue  5=Vie  6=Sáb  7=Dom
 *
 * Cómo correr:
 *   pnpm test src/lib/core/date_utils.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  jsToOurDow,
  jsToWeekIdx,
  formatWeekRange,
  buildWeekDateNumbers,
  MONTHS,
} from './date_utils'

// ── jsToOurDow — conversión JS → schema ──────────────────────────────────────

describe('jsToOurDow', () => {
  it('Lunes (JS=1) → 1', () => expect(jsToOurDow(1)).toBe(1))
  it('Martes (JS=2) → 2', () => expect(jsToOurDow(2)).toBe(2))
  it('Miércoles (JS=3) → 3', () => expect(jsToOurDow(3)).toBe(3))
  it('Jueves (JS=4) → 4', () => expect(jsToOurDow(4)).toBe(4))
  it('Viernes (JS=5) → 5', () => expect(jsToOurDow(5)).toBe(5))
  it('Sábado (JS=6) → 6', () => expect(jsToOurDow(6)).toBe(6))
  it('Domingo (JS=0) → 7 (caso especial — única conversión no trivial)', () => {
    expect(jsToOurDow(0)).toBe(7)
  })

  it('todos los días JS [0-6] mapean a valores en [1-7]', () => {
    for (let jsDay = 0; jsDay <= 6; jsDay++) {
      const ourDow = jsToOurDow(jsDay)
      expect(ourDow).toBeGreaterThanOrEqual(1)
      expect(ourDow).toBeLessThanOrEqual(7)
    }
  })

  it('resultado es biyectivo — cada JS day produce un our dow único', () => {
    const results = new Set([0, 1, 2, 3, 4, 5, 6].map(jsToOurDow))
    expect(results.size).toBe(7) // 7 valores distintos
  })
})

// ── jsToWeekIdx — conversión JS → índice 0-based Mon-first ───────────────────

describe('jsToWeekIdx', () => {
  it('Lunes (JS=1) → índice 0', () => expect(jsToWeekIdx(1)).toBe(0))
  it('Martes (JS=2) → índice 1', () => expect(jsToWeekIdx(2)).toBe(1))
  it('Miércoles (JS=3) → índice 2', () => expect(jsToWeekIdx(3)).toBe(2))
  it('Jueves (JS=4) → índice 3', () => expect(jsToWeekIdx(4)).toBe(3))
  it('Viernes (JS=5) → índice 4', () => expect(jsToWeekIdx(5)).toBe(4))
  it('Sábado (JS=6) → índice 5', () => expect(jsToWeekIdx(6)).toBe(5))
  it('Domingo (JS=0) → índice 6 (último día de la semana)', () => {
    expect(jsToWeekIdx(0)).toBe(6)
  })

  it('todos los índices están en [0-6]', () => {
    for (let jsDay = 0; jsDay <= 6; jsDay++) {
      const idx = jsToWeekIdx(jsDay)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThanOrEqual(6)
    }
  })

  it('jsToOurDow y jsToWeekIdx son consistentes: ourDow - 1 === weekIdx para Lun-Sáb', () => {
    for (let jsDay = 1; jsDay <= 6; jsDay++) {
      expect(jsToOurDow(jsDay) - 1).toBe(jsToWeekIdx(jsDay))
    }
  })

  it('weekSessions[jsToWeekIdx(jsDay)] alinea con sessionDayOfWeek=jsToOurDow(jsDay)', () => {
    // Esta es la invariante crítica del dashboard: el índice en el array weekSessions
    // corresponde a dayOfWeek en la sesión del plan.
    // weekSessions[idx] ↔ session.dayOfWeek === idx + 1
    for (let jsDay = 0; jsDay <= 6; jsDay++) {
      const ourDow = jsToOurDow(jsDay)
      const idx = jsToWeekIdx(jsDay)
      // Para DOM: ourDow=7, idx=6 → 6 === 7-1 ✓
      if (jsDay !== 0) {
        expect(ourDow - 1).toBe(idx)
      } else {
        expect(idx).toBe(6)  // domingo: índice 6
        expect(ourDow).toBe(7) // domingo: dow 7
      }
    }
  })
})

// ── formatWeekRange — formato visual para coach y atleta ─────────────────────

describe('formatWeekRange — misma semana (mismo mes)', () => {
  it('lunes 7 jul → "7–13 jul"', () => {
    const monday = new Date(2026, 6, 7) // 7 julio 2026 (lunes)
    expect(formatWeekRange(monday)).toBe('7–13 jul')
  })

  it('lunes 1 jun → "1–7 jun"', () => {
    const monday = new Date(2026, 5, 1) // 1 junio 2026
    expect(formatWeekRange(monday)).toBe('1–7 jun')
  })

  it('lunes 16 mar → "16–22 mar"', () => {
    const monday = new Date(2026, 2, 16)
    expect(formatWeekRange(monday)).toBe('16–22 mar')
  })
})

describe('formatWeekRange — semana que cruza mes', () => {
  it('lunes 28 jul → "28 jul – 3 ago"', () => {
    const monday = new Date(2026, 6, 28)
    expect(formatWeekRange(monday)).toBe('28 jul – 3 ago')
  })

  it('lunes 30 jun → "30 jun – 6 jul"', () => {
    const monday = new Date(2026, 5, 30)
    expect(formatWeekRange(monday)).toBe('30 jun – 6 jul')
  })

  it('lunes 28 dic → "28 dic – 3 ene"', () => {
    const monday = new Date(2026, 11, 28)
    expect(formatWeekRange(monday)).toBe('28 dic – 3 ene')
  })
})

describe('formatWeekRange — invariantes', () => {
  it('siempre retorna string no vacío', () => {
    const monday = new Date(2026, 0, 5)
    expect(formatWeekRange(monday)).toBeTruthy()
  })

  it('los 12 meses usan las abreviaciones en español', () => {
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    expect(MONTHS).toEqual(months)
  })
})

// ── buildWeekDateNumbers ──────────────────────────────────────────────────────

describe('buildWeekDateNumbers', () => {
  it('lunes 7 jul: dow 1=7, 2=8, ... 7=13', () => {
    const monday = new Date(2026, 6, 7) // lunes 7 julio
    const dates = buildWeekDateNumbers(monday)
    expect(dates[1]).toBe(7)  // Lun
    expect(dates[2]).toBe(8)  // Mar
    expect(dates[3]).toBe(9)  // Mié
    expect(dates[4]).toBe(10) // Jue
    expect(dates[5]).toBe(11) // Vie
    expect(dates[6]).toBe(12) // Sáb
    expect(dates[7]).toBe(13) // Dom
  })

  it('genera exactamente 7 entradas (dow 1–7)', () => {
    const dates = buildWeekDateNumbers(new Date(2026, 0, 5))
    expect(Object.keys(dates)).toHaveLength(7)
    for (let dow = 1; dow <= 7; dow++) {
      expect(dates).toHaveProperty(String(dow))
    }
  })

  it('semana que cruza mes: dow 7 tiene fecha del mes siguiente', () => {
    const monday = new Date(2026, 6, 28) // lunes 28 jul
    const dates = buildWeekDateNumbers(monday)
    expect(dates[7]).toBe(3) // domingo 3 agosto
  })

  it('no muta el objeto monday original', () => {
    const monday = new Date(2026, 6, 7)
    const original = monday.getTime()
    buildWeekDateNumbers(monday)
    expect(monday.getTime()).toBe(original)
  })

  it('dow 1 siempre coincide con el día del lunes pasado como input', () => {
    const monday = new Date(2026, 3, 6) // lunes 6 abril
    expect(buildWeekDateNumbers(monday)[1]).toBe(6)
  })
})
