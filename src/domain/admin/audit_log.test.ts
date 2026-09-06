import { describe, it, expect } from 'vitest'
import {
  labelForAction,
  describeAuditEntry,
  colorForAction,
  ADMIN_ACTIONS,
} from './audit_log'

// ---------------------------------------------------------------------------
// labelForAction
// ---------------------------------------------------------------------------
describe('labelForAction', () => {
  it('CHANGE_ROLE → "Cambio de rol"', () => {
    expect(labelForAction(ADMIN_ACTIONS.CHANGE_ROLE)).toBe('Cambio de rol')
  })

  it('CHANGE_PLAN → "Cambio de plan"', () => {
    expect(labelForAction(ADMIN_ACTIONS.CHANGE_PLAN)).toBe('Cambio de plan')
  })

  it('acción desconocida → devuelve la acción tal cual', () => {
    expect(labelForAction('CUSTOM_ACTION')).toBe('CUSTOM_ACTION')
  })
})

// ---------------------------------------------------------------------------
// describeAuditEntry
// ---------------------------------------------------------------------------
describe('describeAuditEntry', () => {
  it('CHANGE_ROLE con meta from/to incluye el nombre del usuario', () => {
    const desc = describeAuditEntry({
      action: ADMIN_ACTIONS.CHANGE_ROLE,
      meta: { from: 'ATHLETE', to: 'COACH' },
      targetUserName: 'Juan Pérez',
    })
    expect(desc).toBe('Cambió rol de Juan Pérez: ATHLETE → COACH')
  })

  it('CHANGE_ROLE sin targetUserName usa "usuario desconocido"', () => {
    const desc = describeAuditEntry({
      action: ADMIN_ACTIONS.CHANGE_ROLE,
      meta: { from: 'ATHLETE', to: 'ADMIN' },
      targetUserName: null,
    })
    expect(desc).toContain('usuario desconocido')
  })

  it('CHANGE_PLAN incluye el plan destino', () => {
    const desc = describeAuditEntry({
      action: ADMIN_ACTIONS.CHANGE_PLAN,
      meta: { plan: 'PRO' },
      targetUserName: 'Ana García',
    })
    expect(desc).toBe('Cambió plan de Ana García a PRO')
  })

  it('CHANGE_PLAN con meta null usa "?" como plan', () => {
    const desc = describeAuditEntry({
      action: ADMIN_ACTIONS.CHANGE_PLAN,
      meta: null,
      targetUserName: 'Ana García',
    })
    expect(desc).toContain('?')
  })

  it('acción desconocida devuelve "Acción: X"', () => {
    const desc = describeAuditEntry({
      action: 'MY_CUSTOM_ACTION',
      meta: null,
      targetUserName: null,
    })
    expect(desc).toBe('Acción: MY_CUSTOM_ACTION')
  })
})

// ---------------------------------------------------------------------------
// colorForAction
// ---------------------------------------------------------------------------
describe('colorForAction', () => {
  it('CHANGE_ROLE → azul', () => {
    const c = colorForAction(ADMIN_ACTIONS.CHANGE_ROLE)
    expect(c.bg).toContain('blue')
    expect(c.text).toContain('blue')
  })

  it('CHANGE_PLAN → naranja', () => {
    const c = colorForAction(ADMIN_ACTIONS.CHANGE_PLAN)
    expect(c.bg).toContain('orange')
  })

  it('DELETE_USER → rojo', () => {
    const c = colorForAction(ADMIN_ACTIONS.DELETE_USER)
    expect(c.bg).toContain('red')
    expect(c.text).toContain('red')
  })

  it('acción desconocida → gris', () => {
    const c = colorForAction('???')
    expect(c.bg).toContain('gray')
    expect(c.text).toContain('gray')
  })
})

// ---------------------------------------------------------------------------
// DELETE_USER — label + descripción
// ---------------------------------------------------------------------------
describe('labelForAction — DELETE_USER', () => {
  it('DELETE_USER → "Eliminación"', () => {
    expect(labelForAction(ADMIN_ACTIONS.DELETE_USER)).toBe('Eliminación')
  })
})

describe('describeAuditEntry — DELETE_USER', () => {
  it('usa datos de meta (email, name, role) aunque targetUserName sea null', () => {
    const desc = describeAuditEntry({
      action: ADMIN_ACTIONS.DELETE_USER,
      meta: { email: 'juan@example.com', name: 'Juan Pérez', role: 'ATHLETE' },
      targetUserName: null,
    })
    expect(desc).toContain('Juan Pérez')
    expect(desc).toContain('juan@example.com')
    expect(desc).toContain('ATHLETE')
  })

  it('funciona sin name en meta', () => {
    const desc = describeAuditEntry({
      action: ADMIN_ACTIONS.DELETE_USER,
      meta: { email: 'anon@example.com', name: null, role: 'COACH' },
      targetUserName: null,
    })
    expect(desc).toContain('anon@example.com')
    expect(desc).toContain('COACH')
  })

  it('incluye email entre paréntesis si está disponible', () => {
    const desc = describeAuditEntry({
      action: ADMIN_ACTIONS.DELETE_USER,
      meta: { email: 'test@ex.com', name: 'Test', role: 'ADMIN' },
      targetUserName: null,
    })
    expect(desc).toMatch(/\(test@ex\.com\)/)
  })
})
