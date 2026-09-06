/**
 * E2E agent: getDisplayStatus — estado derivado de pagos coach
 *
 * OVERDUE no existe en DB (enum: PENDING | PAID).
 * Se computa en presentación: PENDING + dueDate pasada → OVERDUE.
 *
 * Flujo cubierto:
 *   /coach/finanzas → Payment[] → getDisplayStatus → badge en UI
 *   El coach ve PENDING/OVERDUE/PAID en la lista de cobros a sus atletas.
 *
 * Edge case crítico — "dueDate hoy":
 *   new Date(dueDate) < new Date() → si dueDate es start-of-day (medianoche),
 *   ya es OVERDUE a las 00:00:01. Para que sea PENDING en todo el día del vencimiento,
 *   el dueDate debe estar al final del día (23:59:59).
 *   La UI debe guardar dueDate al final del día para evitar OVERDUE prematuro.
 *
 * Cómo correr:
 *   pnpm test src/lib/coach/payment_status.test.ts
 */
import { describe, it, expect } from 'vitest'
import { getDisplayStatus } from './payment_status'

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

function endOfToday(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ── PAID siempre gana ─────────────────────────────────────────────────────────

describe('getDisplayStatus — PAID', () => {
  it('PAID cuando status=PAID con dueDate pasada', () => {
    expect(getDisplayStatus({ status: 'PAID', dueDate: daysFromNow(-30) })).toBe('PAID')
  })

  it('PAID cuando status=PAID con dueDate futura', () => {
    expect(getDisplayStatus({ status: 'PAID', dueDate: daysFromNow(7) })).toBe('PAID')
  })

  it('PAID cuando status=PAID con dueDate de hoy', () => {
    expect(getDisplayStatus({ status: 'PAID', dueDate: endOfToday() })).toBe('PAID')
  })

  it('PAID ignora completamente la dueDate', () => {
    // Si ya está pagado, da igual la fecha — siempre PAID
    const past = new Date()
    past.setFullYear(past.getFullYear() - 2)
    expect(getDisplayStatus({ status: 'PAID', dueDate: past })).toBe('PAID')
  })
})

// ── OVERDUE ───────────────────────────────────────────────────────────────────

describe('getDisplayStatus — OVERDUE', () => {
  it('OVERDUE cuando PENDING y dueDate fue ayer', () => {
    expect(getDisplayStatus({ status: 'PENDING', dueDate: daysFromNow(-1) })).toBe('OVERDUE')
  })

  it('OVERDUE cuando PENDING y dueDate fue hace 30 días', () => {
    expect(getDisplayStatus({ status: 'PENDING', dueDate: daysFromNow(-30) })).toBe('OVERDUE')
  })

  it('OVERDUE cuando dueDate es objeto Date pasado', () => {
    const past = new Date()
    past.setDate(past.getDate() - 5)
    expect(getDisplayStatus({ status: 'PENDING', dueDate: past })).toBe('OVERDUE')
  })

  it('OVERDUE cuando dueDate es start-of-day de hoy (ya es pasado a cualquier hora del día)', () => {
    // Comportamiento documentado: dueDate al inicio del día (00:00:00) ya es < now()
    // El coach debe guardar dueDate como endOfToday para evitar OVERDUE prematuro
    expect(getDisplayStatus({ status: 'PENDING', dueDate: startOfToday() })).toBe('OVERDUE')
  })
})

// ── PENDING ───────────────────────────────────────────────────────────────────

describe('getDisplayStatus — PENDING', () => {
  it('PENDING cuando PENDING y dueDate es en 7 días', () => {
    expect(getDisplayStatus({ status: 'PENDING', dueDate: daysFromNow(7) })).toBe('PENDING')
  })

  it('PENDING cuando PENDING y dueDate es en 30 días', () => {
    expect(getDisplayStatus({ status: 'PENDING', dueDate: daysFromNow(30) })).toBe('PENDING')
  })

  it('PENDING cuando PENDING y dueDate es el final del día de hoy', () => {
    // Si el coach guarda dueDate al final del día, es PENDING durante todo el día
    expect(getDisplayStatus({ status: 'PENDING', dueDate: endOfToday() })).toBe('PENDING')
  })

  it('PENDING cuando dueDate es objeto Date futuro', () => {
    const future = new Date()
    future.setDate(future.getDate() + 14)
    expect(getDisplayStatus({ status: 'PENDING', dueDate: future })).toBe('PENDING')
  })

  it('acepta string ISO', () => {
    expect(getDisplayStatus({ status: 'PENDING', dueDate: daysFromNow(30) })).toBe('PENDING')
  })
})

// ── Invariantes ───────────────────────────────────────────────────────────────

describe('getDisplayStatus — invariantes', () => {
  it('solo retorna PAID | PENDING | OVERDUE', () => {
    const validStatuses = new Set(['PAID', 'PENDING', 'OVERDUE'])
    const cases = [
      { status: 'PAID' as const, dueDate: daysFromNow(-10) },
      { status: 'PAID' as const, dueDate: daysFromNow(10) },
      { status: 'PENDING' as const, dueDate: daysFromNow(-5) },
      { status: 'PENDING' as const, dueDate: daysFromNow(5) },
    ]
    cases.forEach(({ status, dueDate }) => {
      const result = getDisplayStatus({ status, dueDate })
      expect(validStatuses.has(result), `"${result}" no es un DisplayStatus válido`).toBe(true)
    })
  })

  it('status PAID nunca produce OVERDUE ni PENDING', () => {
    const past = daysFromNow(-100)
    expect(getDisplayStatus({ status: 'PAID', dueDate: past })).not.toBe('OVERDUE')
    expect(getDisplayStatus({ status: 'PAID', dueDate: past })).not.toBe('PENDING')
  })
})
